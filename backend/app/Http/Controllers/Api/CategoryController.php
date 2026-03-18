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

    public function show(string $slug): JsonResponse
    {
        $category = $this->categoryService->getBySlug($slug);

        $products = Product::where('is_active', true)
            ->where(function ($query) use ($category) {
                $query->where('category_id', $category->id)
                    ->orWhereHas('category', function ($q) use ($category) {
                        $pathPrefix = $category->path
                            ? $category->path . '/' . $category->id
                            : (string) $category->id;
                        $q->where('path', 'LIKE', $pathPrefix . '%');
                    });
            })
            ->with(['images', 'brand', 'category'])
            ->orderByRaw("CASE WHEN stock_quantity > 0 AND price > 0 AND stock_status != 'out_of_stock' THEN 0 ELSE 1 END ASC")
            ->orderBy('sort_order')
            ->paginate(request()->input('per_page', 15))
            ->appends(request()->query());

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
