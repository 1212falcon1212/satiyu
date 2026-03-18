<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductListResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:255'],
        ]);

        $query = $request->input('q');
        $perPage = (int) $request->input('per_page', 15);

        // Build Meilisearch filter
        $filters = ['is_active = true'];

        if ($request->filled('category_id')) {
            $filters[] = 'category_id = ' . (int) $request->input('category_id');
        }
        if ($request->filled('brand_id')) {
            $filters[] = 'brand_id = ' . (int) $request->input('brand_id');
        }
        if ($request->filled('min_price') || $request->filled('max_price')) {
            $min = $request->input('min_price', 0);
            $max = $request->input('max_price', 999999);
            $filters[] = "price >= {$min} AND price <= {$max}";
        }

        $filterString = implode(' AND ', $filters);

        // Sort
        $sort = match ($request->input('sort')) {
            'price_asc' => ['price:asc'],
            'price_desc' => ['price:desc'],
            'newest' => ['created_at:desc'],
            'name_asc' => ['name:asc'],
            default => [],
        };

        // Search via Meilisearch through Scout
        $results = Product::search($query, function ($meilisearch, $q, $options) use ($filterString, $sort, $perPage, $request) {
            $options['filter'] = $filterString;
            $options['limit'] = $perPage;
            $options['offset'] = ($request->input('page', 1) - 1) * $perPage;

            if (!empty($sort)) {
                $options['sort'] = $sort;
            }

            // Request facets for filter counts
            $options['facets'] = ['brand_id', 'category_id'];

            return $meilisearch->search($q, $options);
        });

        // Get raw Meilisearch response for meta
        $rawResults = $results->raw();

        // Get product IDs from results, then load full models
        $ids = collect($rawResults['hits'])->pluck('id')->all();

        $products = [];
        if (!empty($ids)) {
            $products = Product::whereIn('id', $ids)
                ->with(['images', 'brand', 'category'])
                ->get()
                ->sortBy(fn ($p) => array_search($p->id, $ids))
                ->values();
        }

        $total = $rawResults['estimatedTotalHits'] ?? count($ids);
        $page = (int) $request->input('page', 1);

        return response()->json([
            'data' => ProductListResource::collection($products),
            'meta' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => (int) ceil($total / $perPage),
                'from' => ($page - 1) * $perPage + 1,
                'to' => min($page * $perPage, $total),
            ],
            'facets' => $rawResults['facetDistribution'] ?? null,
        ]);
    }
}
