<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductListResource;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpFoundation\Response;

class ProductController extends Controller
{
    public function __construct(
        private readonly ProductService $productService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $products = QueryBuilder::for(Product::class)
            ->allowedFilters([
                AllowedFilter::exact('category_id'),
                AllowedFilter::callback('category_tree', function ($query, $value) {
                    $category = Category::find($value);
                    if (!$category) return;
                    $pathPrefix = $category->path
                        ? $category->path . '/' . $category->id
                        : (string) $category->id;
                    $query->where(function ($q) use ($value, $pathPrefix) {
                        $q->where('category_id', $value)
                            ->orWhereHas('category', function ($sub) use ($pathPrefix) {
                                $sub->where('path', 'LIKE', $pathPrefix . '%');
                            });
                    });
                }),
                AllowedFilter::exact('brand_id'),
                AllowedFilter::exact('is_active'),
                AllowedFilter::exact('is_featured'),
                AllowedFilter::exact('show_on_homepage'),
                AllowedFilter::exact('is_new'),
                AllowedFilter::exact('stock_status'),
                AllowedFilter::partial('name'),
                AllowedFilter::partial('sku'),
            ])
            ->allowedSorts(['name', 'price', 'created_at', 'sort_order', 'stock_quantity'])
            ->defaultSort('-created_at')
            ->with(['images', 'brand', 'category'])
            ->paginate($request->input('per_page', 15))
            ->appends($request->query());

        return response()->json(
            ProductListResource::collection($products)->response()->getData(true),
        );
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = $this->productService->store($request->validated());
        $product->load(['brand', 'category', 'images', 'variants', 'attributes']);

        return response()->json([
            'data' => new ProductResource($product),
        ], Response::HTTP_CREATED);
    }

    public function show(int $id): JsonResponse
    {
        $product = Product::with([
            'brand',
            'category',
            'images' => fn ($q) => $q->orderBy('sort_order'),
            'variants.variantValues.variantOption.variantType',
            'variants.images',
            'attributes',
        ])->findOrFail($id);

        return response()->json([
            'data' => new ProductResource($product),
        ]);
    }

    public function update(UpdateProductRequest $request, int $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $product = $this->productService->update($product, $request->validated());
        $product->load(['brand', 'category', 'images', 'variants', 'attributes']);

        return response()->json([
            'data' => new ProductResource($product),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $this->productService->delete($product);

        return response()->json([
            'data' => [
                'message' => 'Product deleted successfully.',
            ],
        ]);
    }

    public function bulkDelete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_ids' => 'required|array|min:1',
            'product_ids.*' => 'integer|exists:products,id',
        ]);

        $count = Product::whereIn('id', $validated['product_ids'])->count();
        Product::whereIn('id', $validated['product_ids'])->delete();

        return response()->json([
            'message' => "{$count} ürün silindi.",
            'deleted' => $count,
        ]);
    }

    public function bulkPrice(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|in:set,increase,decrease',
            'value' => 'required|numeric|min:0',
            'is_percentage' => 'required|boolean',
            'targets' => 'required|array',
            'targets.*' => 'in:price,compare_price',
            'product_ids' => 'required_without:filters|array',
            'product_ids.*' => 'integer',
            'filters' => 'required_without:product_ids|array',
            'filters.category_id' => 'sometimes|integer',
            'filters.brand_id' => 'sometimes|integer',
            'filters.name' => 'sometimes|string',
            'filters.is_active' => 'sometimes',
            'filters.stock_status' => 'sometimes|string',
        ]);

        $action = $validated['action'];
        $value = (float) $validated['value'];
        $isPercentage = (bool) $validated['is_percentage'];
        $targets = $validated['targets'];

        // Build product query
        if (!empty($validated['product_ids'])) {
            $query = Product::whereIn('id', $validated['product_ids']);
        } else {
            $filters = $validated['filters'];
            $query = Product::query();

            if (!empty($filters['category_id'])) {
                $query->where('category_id', $filters['category_id']);
            }
            if (!empty($filters['brand_id'])) {
                $query->where('brand_id', $filters['brand_id']);
            }
            if (!empty($filters['name'])) {
                $query->where('name', 'LIKE', '%' . $filters['name'] . '%');
            }
            if (isset($filters['is_active']) && $filters['is_active'] !== '') {
                $query->where('is_active', $filters['is_active']);
            }
            if (!empty($filters['stock_status'])) {
                if ($filters['stock_status'] === 'in_stock') {
                    $query->where('stock_quantity', '>', 0);
                } elseif ($filters['stock_status'] === 'out_of_stock') {
                    $query->where('stock_quantity', '<=', 0);
                }
            }
        }

        $productIds = $query->pluck('id');
        $count = $productIds->count();

        if ($count === 0) {
            return response()->json(['data' => ['updated_count' => 0]]);
        }

        DB::transaction(function () use ($productIds, $targets, $action, $value, $isPercentage) {
            foreach ($targets as $field) {
                // Update products
                $this->applyPriceUpdate(
                    Product::whereIn('id', $productIds)->whereNotNull($field),
                    $field,
                    $action,
                    $value,
                    $isPercentage,
                );

                // Also update variants that have non-null values for this field
                $this->applyPriceUpdate(
                    ProductVariant::whereIn('product_id', $productIds)->whereNotNull($field),
                    $field,
                    $action,
                    $value,
                    $isPercentage,
                );

                // For 'set' action, also update products where the field is null (or zero)
                if ($action === 'set') {
                    $this->applyPriceUpdate(
                        Product::whereIn('id', $productIds)->whereNull($field),
                        $field,
                        $action,
                        $value,
                        $isPercentage,
                    );
                }
            }
        });

        return response()->json(['data' => ['updated_count' => $count]]);
    }

    private function applyPriceUpdate($query, string $field, string $action, float $value, bool $isPercentage): void
    {
        match ($action) {
            'set' => $query->update([$field => $value]),
            'increase' => $isPercentage
                ? $query->update([$field => DB::raw("ROUND({$field} * (1 + {$value} / 100), 2)")])
                : $query->update([$field => DB::raw("ROUND({$field} + {$value}, 2)")]),
            'decrease' => $isPercentage
                ? $query->update([$field => DB::raw("ROUND(GREATEST({$field} * (1 - {$value} / 100), 0), 2)")])
                : $query->update([$field => DB::raw("ROUND(GREATEST({$field} - {$value}, 0), 2)")]),
        };
    }
}
