<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductListResource;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function __construct(
        private readonly ProductService $productService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Product::where('is_active', true)
            ->with(['images', 'brand', 'category']);

        if ($request->filled('category_id')) {
            $categoryId = (int) $request->input('category_id');
            $childIds = Category::where('parent_id', $categoryId)->pluck('id')->toArray();
            $allIds = array_merge([$categoryId], $childIds);
            $query->whereIn('category_id', $allIds);
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->input('brand_id'));
        }

        if ($request->filled('price_min')) {
            $query->where('price', '>=', $request->input('price_min'));
        }

        if ($request->filled('price_max')) {
            $query->where('price', '<=', $request->input('price_max'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('description', 'LIKE', "%{$search}%")
                    ->orWhere('sku', 'LIKE', "%{$search}%");
            });
        }

        if ($request->filled('is_featured')) {
            $query->where('is_featured', filter_var($request->input('is_featured'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('show_on_homepage')) {
            $query->where('show_on_homepage', filter_var($request->input('show_on_homepage'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('is_new')) {
            $query->where('is_new', filter_var($request->input('is_new'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('exclude')) {
            $excludeIds = is_array($request->input('exclude'))
                ? $request->input('exclude')
                : explode(',', $request->input('exclude'));
            $query->whereNotIn('id', array_map('intval', $excludeIds));
        }

        if ($request->filled('variant_options')) {
            $optionIds = is_array($request->input('variant_options'))
                ? $request->input('variant_options')
                : explode(',', $request->input('variant_options'));

            $query->whereHas('variants.variantOptions', function ($q) use ($optionIds) {
                $q->whereIn('variant_options.id', $optionIds);
            });
        }

        // Out-of-stock / zero-price products always pushed to the end
        $query->orderByRaw("CASE WHEN stock_quantity > 0 AND price > 0 AND stock_status != 'out_of_stock' THEN 0 ELSE 1 END ASC");

        $sortField = $request->input('sort', 'created_at');
        $sortDirection = $request->input('order', 'desc');
        $allowedSorts = ['name', 'price', 'created_at', 'sort_order'];

        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $products = $query
            ->paginate($request->input('per_page', 15))
            ->appends($request->query());

        return response()->json(
            ProductListResource::collection($products)->response()->getData(true),
        );
    }

    public function show(string $slug): JsonResponse
    {
        $product = $this->productService->getBySlug($slug);

        return response()->json([
            'data' => new ProductResource($product),
        ]);
    }
}
