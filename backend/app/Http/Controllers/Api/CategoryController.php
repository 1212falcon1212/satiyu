<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\CategoryTreeResource;
use App\Http\Resources\ProductListResource;
use App\Models\Category;
use App\Models\Product;
use App\Services\CategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function __construct(
        private readonly CategoryService $categoryService,
    ) {}

    public function index(): JsonResponse
    {
        $categories = $this->categoryService->getTree();

        return response()->json([
            'data' => CategoryTreeResource::collection($categories),
        ]);
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        $category = $this->categoryService->getBySlug($slug);

        $query = Product::query()
            ->where('is_active', true)
            ->where(function ($q) use ($category) {
                $q->where('category_id', $category->id)
                    ->orWhereHas('category', function ($sub) use ($category) {
                        $pathPrefix = $category->path
                            ? $category->path . '/' . $category->id
                            : (string) $category->id;
                        $sub->where('path', 'LIKE', $pathPrefix . '%');
                    });
            });

        // Brand filters
        if ($request->filled('brands')) {
            $brandIds = array_filter(explode(',', $request->input('brands')));
            $query->whereIn('brand_id', $brandIds);
        } elseif ($request->filled('brand_id')) {
            $query->where('brand_id', $request->input('brand_id'));
        }

        // Price filters (support both naming conventions)
        if ($request->filled('min_price') || $request->filled('price_min')) {
            $query->where('price', '>=', $request->input('min_price', $request->input('price_min')));
        }
        if ($request->filled('max_price') || $request->filled('price_max')) {
            $query->where('price', '<=', $request->input('max_price', $request->input('price_max')));
        }

        // Search filter
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        $products = $query
            ->with(['images', 'brand', 'category'])
            ->orderByRaw("CASE WHEN stock_quantity > 0 AND price > 0 AND stock_status != 'out_of_stock' THEN 0 ELSE 1 END ASC")
            ->orderBy('sort_order')
            ->paginate($request->input('per_page', 15))
            ->appends($request->query());

        return response()->json([
            'data' => [
                'category' => new CategoryResource($category),
                'children' => CategoryResource::collection($category->children),
                'ancestors' => $this->categoryService->getCategoryWithAncestors($category),
                'products' => ProductListResource::collection($products)->response()->getData(true),
            ],
        ]);
    }

    public function featured(): JsonResponse
    {
        $categories = Category::where('is_active', true)
            ->where(function ($q) {
                $q->where('is_featured', true)
                    ->orWhere(function ($q2) {
                        $q2->whereNotNull('homepage_product_ids')
                            ->whereJsonLength('homepage_product_ids', '>', 0);
                    });
            })
            ->orderBy('sort_order')
            ->get();

        $result = [];

        foreach ($categories as $category) {
            $catData = (new CategoryResource($category))->resolve();

            $productIds = $category->homepage_product_ids ?? [];
            $products = collect();

            if (!empty($productIds)) {
                $products = Product::whereIn('id', $productIds)
                    ->where('is_active', true)
                    ->with(['images', 'brand', 'category'])
                    ->get()
                    ->sortBy(fn ($p) => array_search($p->id, $productIds));
            }

            $catData['products'] = ProductListResource::collection($products);
            $result[] = $catData;
        }

        return response()->json([
            'data' => $result,
        ]);
    }

    public function children(string $slug): JsonResponse
    {
        $category = Category::where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        $children = $category->children()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'data' => CategoryResource::collection($children),
        ]);
    }
}
