<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductListResource;
use App\Models\Product;
use App\Services\HomepageSectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class HomepageSectionController extends Controller
{
    public function __construct(
        private readonly HomepageSectionService $service,
    ) {}

    public function index(): JsonResponse
    {
        $sections = Cache::remember('homepage_sections', 300, function () {
            return $this->service->getActiveSections();
        });

        return response()->json(['data' => $sections]);
    }

    /**
     * Paginated random products for "Tüm Ürünler" section.
     * Uses a seed for consistent random order within a session.
     * GET /api/homepage/random-products?page=1&per_page=24&seed=12345
     */
    public function randomProducts(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->input('page', 1));
        $perPage = min(24, max(4, (int) $request->input('per_page', 24)));
        $seed = (int) $request->input('seed', rand(1, 999999));
        $maxTotal = 96;

        // Cap at max 96
        $offset = ($page - 1) * $perPage;
        if ($offset >= $maxTotal) {
            return response()->json([
                'data' => [],
                'meta' => ['current_page' => $page, 'per_page' => $perPage, 'total' => $maxTotal, 'has_more' => false, 'seed' => $seed],
            ]);
        }

        $remaining = min($perPage, $maxTotal - $offset);

        // Use RAND(seed) for consistent ordering per session
        $products = Product::where('is_active', true)
            ->where('stock_quantity', '>', 0)
            ->where('price', '>', 0)
            ->select(['id', 'name', 'slug', 'price', 'compare_price', 'stock_quantity', 'stock_status', 'is_active', 'is_featured', 'show_on_homepage', 'is_bestseller', 'is_new', 'brand_id', 'category_id'])
            ->with(['images' => fn ($q) => $q->select(['id', 'product_id', 'image_url', 'is_main', 'sort_order'])->orderBy('sort_order'), 'brand:id,name', 'category:id,name'])
            ->orderByRaw('RAND(?)', [$seed])
            ->offset($offset)
            ->limit($remaining)
            ->get();

        return response()->json([
            'data' => ProductListResource::collection($products),
            'meta' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $maxTotal,
                'has_more' => ($offset + $remaining) < $maxTotal,
                'seed' => $seed,
            ],
        ]);
    }
}
