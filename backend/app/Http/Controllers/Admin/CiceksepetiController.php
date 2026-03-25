<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendMarketplaceProductsRequest;
use App\Http\Requests\UpdatePriceStockRequest;
use App\Http\Resources\MarketplaceCategoryResource;
use App\Http\Resources\MarketplaceProductResource;
use App\Jobs\Marketplace\CiceksepetiStockSyncJob;
use App\Jobs\Marketplace\SendCiceksepetiProductsJob;
use App\Jobs\Marketplace\SyncCiceksepetiCategoriesJob;
use App\Models\Category;
use App\Models\MarketplaceCategory;
use App\Models\MarketplaceCategoryMapping;
use App\Models\MarketplaceCredential;
use App\Models\MarketplaceProduct;
use App\Models\MarketplaceStockSyncLog;
use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\Setting;
use App\Services\Marketplace\CiceksepetiApiService;
use App\Services\Marketplace\CiceksepetiProductFormatter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class CiceksepetiController extends Controller
{
    protected function getService(): CiceksepetiApiService
    {
        $credential = MarketplaceCredential::where('marketplace', 'ciceksepeti')
            ->where('is_active', true)
            ->firstOrFail();

        return new CiceksepetiApiService($credential);
    }

    protected function getCredential(): MarketplaceCredential
    {
        return MarketplaceCredential::where('marketplace', 'ciceksepeti')
            ->where('is_active', true)
            ->firstOrFail();
    }

    // ==========================================
    // AYARLAR
    // ==========================================

    public function getSettings(): JsonResponse
    {
        return response()->json([
            'data' => [
                'min_stock' => (int) Setting::get('ciceksepeti.min_stock', 0),
                'delivery_type' => (int) Setting::get('ciceksepeti.delivery_type', 2),
                'delivery_message_type' => (int) Setting::get('ciceksepeti.delivery_message_type', 5),
            ],
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'min_stock' => ['nullable', 'integer', 'min:0'],
            'delivery_type' => ['nullable', 'integer', 'in:1,2,3'],
            'delivery_message_type' => ['nullable', 'integer', 'in:1,4,5,6,7,13,18,19'],
        ]);

        if (isset($validated['min_stock'])) {
            Setting::set('ciceksepeti.min_stock', $validated['min_stock']);
        }
        if (isset($validated['delivery_type'])) {
            Setting::set('ciceksepeti.delivery_type', $validated['delivery_type']);
        }
        if (isset($validated['delivery_message_type'])) {
            Setting::set('ciceksepeti.delivery_message_type', $validated['delivery_message_type']);
        }

        return response()->json(['message' => 'Ayarlar güncellendi.']);
    }

    public function resetStatuses(): JsonResponse
    {
        $updated = MarketplaceProduct::where('marketplace', 'ciceksepeti')
            ->whereIn('status', ['rejected', 'pending'])
            ->update(['status' => 'pending', 'error_message' => null]);

        return response()->json([
            'message' => "{$updated} ürün durumu sıfırlandı.",
        ]);
    }

    // ==========================================
    // KATEGORI
    // ==========================================

    public function syncCategories(): JsonResponse
    {
        $credential = $this->getCredential();

        SyncCiceksepetiCategoriesJob::dispatch($credential->id);

        return response()->json([
            'message' => 'Kategori senk işlemi başladı.',
        ], Response::HTTP_ACCEPTED);
    }

    public function categories(Request $request): JsonResponse
    {
        $query = MarketplaceCategory::where('marketplace', 'ciceksepeti');

        if ($request->has('search')) {
            $query->where('category_name', 'like', '%' . $request->input('search') . '%');
        }

        if ($request->boolean('tree', false)) {
            $categories = $query->whereNull('parent_id')
                ->with('allChildren')
                ->get();
        } else {
            $categories = $query->paginate($request->input('per_page', 50));

            return MarketplaceCategoryResource::collection($categories)->response();
        }

        return MarketplaceCategoryResource::collection($categories)->response();
    }

    public function categoryAttributes(int $categoryId): JsonResponse
    {
        $service = $this->getService();
        $attributes = $service->getCategoryAttributes($categoryId);

        return response()->json(['data' => $attributes]);
    }

    public function searchCategoriesForPicker(Request $request): JsonResponse
    {
        $search = $request->input('search', '');

        if (mb_strlen($search) < 2) {
            return response()->json(['data' => []]);
        }

        $cacheKey = 'ciceksepeti_leaf_categories_with_paths';

        $leafCategoriesWithPaths = Cache::remember($cacheKey, 3600, function () {
            $allCategories = MarketplaceCategory::where('marketplace', 'ciceksepeti')->get();

            $categoryMap = $allCategories->keyBy('marketplace_category_id');

            $parentIds = $allCategories->pluck('parent_id')
                ->filter()
                ->unique()
                ->toArray();

            $leafCategories = $allCategories->filter(fn($c) =>
                !in_array($c->marketplace_category_id, $parentIds)
            );

            $result = [];
            foreach ($leafCategories as $leaf) {
                $path = [];
                $current = $leaf;
                while ($current) {
                    array_unshift($path, $current->category_name);
                    $current = $current->parent_id ? $categoryMap->get($current->parent_id) : null;
                }

                $result[] = [
                    'id' => $leaf->id,
                    'marketplaceCategoryId' => $leaf->marketplace_category_id,
                    'name' => $leaf->category_name,
                    'fullPath' => implode(' > ', $path),
                    'searchText' => mb_strtolower(implode(' ', $path)),
                ];
            }

            return $result;
        });

        $searchLower = mb_strtolower($search);
        $filtered = array_filter($leafCategoriesWithPaths, fn($c) =>
            str_contains($c['searchText'], $searchLower)
        );

        return response()->json([
            'data' => array_values(array_slice($filtered, 0, 50)),
        ]);
    }

    public function categoryMappings(): JsonResponse
    {
        $mappings = MarketplaceCategoryMapping::where('marketplace', 'ciceksepeti')
            ->with(['category', 'marketplaceCategory'])
            ->get();

        return response()->json([
            'data' => $mappings->map(fn($m) => [
                'id' => $m->id,
                'localCategoryId' => $m->local_category_id,
                'marketplaceCategoryId' => $m->marketplace_category_id,
                'category' => $m->category ? [
                    'id' => $m->category->id,
                    'name' => $m->category->name,
                ] : null,
                'marketplaceCategory' => $m->marketplaceCategory ? [
                    'id' => $m->marketplaceCategory->id,
                    'categoryName' => $m->marketplaceCategory->category_name,
                    'marketplaceCategoryId' => $m->marketplaceCategory->marketplace_category_id,
                ] : null,
            ]),
        ]);
    }

    public function categoryMappingsWithPath(): JsonResponse
    {
        $localCategories = Category::all();
        $mappings = MarketplaceCategoryMapping::where('marketplace', 'ciceksepeti')
            ->with('marketplaceCategory')
            ->get()
            ->keyBy('local_category_id');

        $allMpCategories = MarketplaceCategory::where('marketplace', 'ciceksepeti')->get();
        $mpCategoryMap = $allMpCategories->keyBy('marketplace_category_id');

        $data = $localCategories->map(function ($cat) use ($mappings, $mpCategoryMap) {
            $mapping = $mappings->get($cat->id);
            $mpCategory = $mapping?->marketplaceCategory;

            $mpPath = null;
            if ($mpCategory) {
                $path = [];
                $current = $mpCategoryMap->get($mpCategory->marketplace_category_id);
                while ($current) {
                    array_unshift($path, $current->category_name);
                    $current = $current->parent_id ? $mpCategoryMap->get($current->parent_id) : null;
                }
                $mpPath = implode(' > ', $path);
            }

            return [
                'localCategoryId' => $cat->id,
                'localCategoryName' => $cat->name,
                'mappingId' => $mapping?->id,
                'marketplaceCategoryId' => $mpCategory?->id,
                'marketplaceCategoryMpId' => $mpCategory?->marketplace_category_id,
                'marketplaceCategoryName' => $mpCategory?->category_name,
                'marketplaceCategoryPath' => $mpPath,
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function updateCategoryMapping(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'local_category_id' => ['required', 'exists:categories,id'],
            'marketplace_category_id' => ['required', 'exists:marketplace_categories,id'],
        ]);

        $mapping = MarketplaceCategoryMapping::updateOrCreate(
            [
                'marketplace' => 'ciceksepeti',
                'local_category_id' => $validated['local_category_id'],
            ],
            [
                'marketplace_category_id' => $validated['marketplace_category_id'],
            ]
        );

        return response()->json([
            'message' => 'Kategori eşleştirmesi kaydedildi.',
            'data' => ['id' => $mapping->id],
        ]);
    }

    public function batchSaveCategoryMappings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mappings' => ['required', 'array', 'min:1'],
            'mappings.*.local_category_id' => ['required', 'exists:categories,id'],
            'mappings.*.marketplace_category_id' => ['required', 'exists:marketplace_categories,id'],
        ]);

        $count = 0;
        foreach ($validated['mappings'] as $mapping) {
            MarketplaceCategoryMapping::updateOrCreate(
                [
                    'marketplace' => 'ciceksepeti',
                    'local_category_id' => $mapping['local_category_id'],
                ],
                [
                    'marketplace_category_id' => $mapping['marketplace_category_id'],
                ]
            );
            $count++;
        }

        return response()->json([
            'message' => "{$count} kategori eşleştirmesi kaydedildi.",
        ]);
    }

    public function autoMatchCategories(): JsonResponse
    {
        $localCategories = Category::all();
        $mpCategories = MarketplaceCategory::where('marketplace', 'ciceksepeti')->get();

        $existingMappings = MarketplaceCategoryMapping::where('marketplace', 'ciceksepeti')
            ->pluck('local_category_id')
            ->toArray();

        $suggestions = [];

        foreach ($localCategories as $localCat) {
            if (in_array($localCat->id, $existingMappings)) {
                continue;
            }

            $localName = mb_strtolower($localCat->name);
            $bestMatch = null;
            $bestScore = 0;

            foreach ($mpCategories as $mpCat) {
                $mpName = mb_strtolower($mpCat->category_name);
                similar_text($localName, $mpName, $score);

                if ($score > $bestScore && $score >= 60) {
                    $bestScore = $score;
                    $bestMatch = $mpCat;
                }
            }

            if ($bestMatch) {
                $suggestions[] = [
                    'localCategoryId' => $localCat->id,
                    'localCategoryName' => $localCat->name,
                    'marketplaceCategoryId' => $bestMatch->id,
                    'marketplaceCategoryMpId' => $bestMatch->marketplace_category_id,
                    'marketplaceCategoryName' => $bestMatch->category_name,
                    'score' => round($bestScore, 1),
                ];
            }
        }

        usort($suggestions, fn($a, $b) => $b['score'] <=> $a['score']);

        return response()->json(['data' => $suggestions]);
    }

    // ==========================================
    // ÜRÜN
    // ==========================================

    public function localProducts(Request $request): JsonResponse
    {
        $query = Product::where('is_active', true)
            ->with([
                'images', 'brand', 'category',
                'variants' => fn($q) => $q->where('is_active', true),
                'variants.variantValues.variantOption.variantType',
            ])
            ->withCount(['variants' => fn($q) => $q->where('is_active', true)]);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category_id')) {
            $catId = (int) $request->input('category_id');
            $categoryIds = collect([$catId]);
            $parentIds = collect([$catId]);
            while ($parentIds->isNotEmpty()) {
                $childIds = Category::whereIn('parent_id', $parentIds)->pluck('id');
                $categoryIds = $categoryIds->merge($childIds);
                $parentIds = $childIds;
            }
            $query->whereIn('category_id', $categoryIds->unique());
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->input('brand_id'));
        }

        $stockStatus = $request->input('stock_status');
        if ($stockStatus === 'in_stock') {
            $query->where(function ($q) {
                $q->where('stock_quantity', '>', 0)
                    ->orWhereHas('variants', fn($vq) =>
                        $vq->where('is_active', true)->where('stock_quantity', '>', 0)
                    );
            });
        } elseif ($stockStatus === 'out_of_stock') {
            $query->where('stock_quantity', '<=', 0)
                ->whereDoesntHave('variants', fn($vq) =>
                    $vq->where('is_active', true)->where('stock_quantity', '>', 0)
                );
        }

        $hasVariants = $request->input('has_variants');
        if ($hasVariants === 'yes') {
            $query->whereHas('variants', fn($q) => $q->where('is_active', true));
        } elseif ($hasVariants === 'no') {
            $query->whereDoesntHave('variants', fn($q) => $q->where('is_active', true));
        }

        $mpStatus = $request->input('mp_status');
        if ($mpStatus === 'not_sent') {
            $query->whereDoesntHave('marketplaceProducts', fn($q) =>
                $q->where('marketplace', 'ciceksepeti'));
        } elseif ($mpStatus && $mpStatus !== 'all') {
            $query->whereHas('marketplaceProducts', fn($q) =>
                $q->where('marketplace', 'ciceksepeti')->where('status', $mpStatus));
        }

        $readiness = $request->input('readiness');
        if ($readiness === 'ready') {
            $query->whereHas('images')
                ->whereHas('category', function ($q) {
                    $q->whereIn('categories.id', function ($sub) {
                        $sub->select('local_category_id')
                            ->from('marketplace_category_mappings')
                            ->where('marketplace', 'ciceksepeti');
                    });
                });
        } elseif ($readiness === 'not_ready') {
            $query->where(function ($q) {
                $q->whereDoesntHave('images')
                    ->orWhereDoesntHave('category', function ($q2) {
                        $q2->whereIn('categories.id', function ($sub) {
                            $sub->select('local_category_id')
                                ->from('marketplace_category_mappings')
                                ->where('marketplace', 'ciceksepeti');
                        });
                    });
            });
        }

        $products = $query->orderBy('name')
            ->paginate($request->input('per_page', 20));

        $productIds = $products->pluck('id');
        $mpProducts = MarketplaceProduct::where('marketplace', 'ciceksepeti')
            ->whereIn('product_id', $productIds)
            ->get()
            ->keyBy('product_id');

        $categoryIds = $products->pluck('category_id')->unique();
        $categoryMappings = MarketplaceCategoryMapping::where('marketplace', 'ciceksepeti')
            ->whereIn('local_category_id', $categoryIds)
            ->pluck('local_category_id')
            ->toArray();

        $data = $products->map(function ($product) use ($mpProducts, $categoryMappings) {
            $mp = $mpProducts->get($product->id);
            $activeVariants = $product->variants->where('is_active', true);
            $totalStock = $activeVariants->isNotEmpty()
                ? $activeVariants->sum('stock_quantity')
                : $product->stock_quantity;

            return [
                'id' => $product->id,
                'name' => $product->name,
                'barcode' => $product->barcode,
                'sku' => $product->sku,
                'price' => (float) $product->price,
                'comparePrice' => $product->compare_price ? (float) $product->compare_price : null,
                'stockQuantity' => $totalStock,
                'mainImage' => $product->images->first()?->image_url,
                'categoryName' => $product->category?->name,
                'brandName' => $product->brand?->name,
                'categoryId' => $product->category_id,
                'brandId' => $product->brand_id,
                'hasCategoryMapping' => in_array($product->category_id, $categoryMappings),
                'hasImages' => $product->images->count() > 0,
                'hasVariants' => $product->variants_count > 0,
                'variantCount' => $product->variants_count,
                'variants' => $activeVariants->map(fn($v) => [
                    'id' => $v->id,
                    'barcode' => $v->barcode,
                    'sku' => $v->sku,
                    'price' => (float) ($v->price ?? $product->price),
                    'comparePrice' => $v->compare_price ? (float) $v->compare_price : null,
                    'stockQuantity' => $v->stock_quantity,
                    'values' => $v->variantValues->map(fn($vv) => [
                        'typeName' => $vv->variantOption?->variantType?->name,
                        'value' => $vv->variantOption?->value,
                    ])->filter(fn($val) => $val['typeName'])->values()->toArray(),
                ])->values()->toArray(),
                'marketplaceStatus' => $mp?->status,
                'errorMessage' => $mp?->error_message,
                'lastSyncedAt' => $mp?->last_synced_at?->toISOString(),
            ];
        });

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    public function localProductIds(Request $request): JsonResponse
    {
        $query = Product::where('is_active', true);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }

        $mpStatus = $request->input('mp_status');
        if ($mpStatus === 'not_sent') {
            $query->whereDoesntHave('marketplaceProducts', fn($q) =>
                $q->where('marketplace', 'ciceksepeti'));
        } elseif ($mpStatus && $mpStatus !== 'all') {
            $query->whereHas('marketplaceProducts', fn($q) =>
                $q->where('marketplace', 'ciceksepeti')->where('status', $mpStatus));
        }

        $ids = $query->pluck('id');

        return response()->json([
            'ids' => $ids,
            'total' => $ids->count(),
        ]);
    }

    public function products(Request $request): JsonResponse
    {
        $query = MarketplaceProduct::where('marketplace', 'ciceksepeti')
            ->with('product');

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('marketplace_barcode', 'like', "%{$search}%")
                    ->orWhereHas('product', fn($q2) => $q2->where('name', 'like', "%{$search}%"));
            });
        }

        $products = $query->orderByDesc('updated_at')
            ->paginate($request->input('per_page', 20));

        return MarketplaceProductResource::collection($products)->response();
    }

    public function prepareSend(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_ids' => ['required', 'array', 'min:1'],
            'product_ids.*' => ['exists:products,id'],
        ]);

        $products = Product::with([
            'images', 'brand', 'category', 'attributes',
            'variants' => fn($q) => $q->where('is_active', true),
            'variants.variantValues.variantOption.variantType',
        ])
            ->whereIn('id', $validated['product_ids'])
            ->get();

        $grouped = $products->groupBy('category_id');
        $zeroStockProductIds = [];
        $categoryGroups = [];

        foreach ($grouped as $categoryId => $categoryProducts) {
            if (!$categoryId) {
                continue;
            }

            $mapping = MarketplaceCategoryMapping::where('marketplace', 'ciceksepeti')
                ->where('local_category_id', $categoryId)
                ->with('marketplaceCategory')
                ->first();

            $categoryAttributes = [];
            $marketplaceCategoryId = null;
            $marketplaceCategoryName = null;

            if ($mapping?->marketplaceCategory) {
                $marketplaceCategoryId = $mapping->marketplaceCategory->marketplace_category_id;
                $marketplaceCategoryName = $mapping->marketplaceCategory->category_name;

                $storedAttributes = $mapping->marketplaceCategory->attributes;
                if (!empty($storedAttributes)) {
                    $categoryAttributes = $storedAttributes;
                } else {
                    try {
                        $service = $this->getService();
                        $categoryAttributes = $service->getCategoryAttributes($marketplaceCategoryId);
                    } catch (\Exception) {
                    }
                }
            }

            $productData = [];
            foreach ($categoryProducts as $product) {
                $activeVariants = $product->variants->where('is_active', true);
                $totalStock = $activeVariants->isNotEmpty()
                    ? $activeVariants->sum('stock_quantity')
                    : $product->stock_quantity;

                if ($totalStock <= 0) {
                    $zeroStockProductIds[] = $product->id;
                }

                $variantTypes = [];
                foreach ($activeVariants as $variant) {
                    $variantValues = $variant->relationLoaded('variantValues')
                        ? $variant->variantValues
                        : $variant->variantValues()->with('variantOption.variantType')->get();

                    foreach ($variantValues as $vv) {
                        $typeName = $vv->variantOption?->variantType?->name;
                        if ($typeName && !in_array($typeName, $variantTypes)) {
                            $variantTypes[] = $typeName;
                        }
                    }
                }

                $productData[] = [
                    'id' => $product->id,
                    'name' => $product->name,
                    'barcode' => $product->barcode,
                    'mainImage' => $product->images->first()?->image_url,
                    'stockQuantity' => $totalStock,
                    'existingAttributes' => $product->attributes->map(fn($a) => [
                        'name' => $a->attribute_name,
                        'value' => $a->attribute_value,
                    ])->toArray(),
                    'variantTypes' => $variantTypes,
                ];
            }

            $localCategory = Category::find($categoryId);

            $categoryGroups[] = [
                'localCategoryId' => (int) $categoryId,
                'localCategoryName' => $localCategory?->name ?? 'Bilinmeyen',
                'marketplaceCategoryId' => $marketplaceCategoryId,
                'marketplaceCategoryName' => $marketplaceCategoryName,
                'productIds' => $categoryProducts->pluck('id')->values()->toArray(),
                'products' => $productData,
                'categoryAttributes' => $categoryAttributes,
            ];
        }

        return response()->json([
            'categoryGroups' => $categoryGroups,
            'zeroStockProductIds' => array_values(array_unique($zeroStockProductIds)),
        ]);
    }

    public function saveProductAttributes(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'attributes' => ['required', 'array'],
            'attributes.*.attribute_name' => ['required', 'string'],
            'attributes.*.attribute_value' => ['required', 'string'],
        ]);

        DB::transaction(function () use ($validated) {
            $productId = $validated['product_id'];
            $attrNames = collect($validated['attributes'])->pluck('attribute_name')->toArray();

            ProductAttribute::where('product_id', $productId)
                ->whereIn('attribute_name', $attrNames)
                ->delete();

            foreach ($validated['attributes'] as $attr) {
                ProductAttribute::create([
                    'product_id' => $productId,
                    'attribute_name' => $attr['attribute_name'],
                    'attribute_value' => $attr['attribute_value'],
                ]);
            }
        });

        return response()->json(['message' => 'Ürün özellikleri kaydedildi.']);
    }

    public function saveCategoryAttributes(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_ids' => ['required', 'array', 'min:1'],
            'product_ids.*' => ['exists:products,id'],
            'attributes' => ['required', 'array'],
            'attributes.*.attribute_name' => ['required', 'string'],
            'attributes.*.attribute_value' => ['required', 'string'],
        ]);

        DB::transaction(function () use ($validated) {
            $attrNames = collect($validated['attributes'])->pluck('attribute_name')->toArray();

            foreach ($validated['product_ids'] as $productId) {
                ProductAttribute::where('product_id', $productId)
                    ->whereIn('attribute_name', $attrNames)
                    ->delete();

                foreach ($validated['attributes'] as $attr) {
                    ProductAttribute::create([
                        'product_id' => $productId,
                        'attribute_name' => $attr['attribute_name'],
                        'attribute_value' => $attr['attribute_value'],
                    ]);
                }
            }
        });

        return response()->json([
            'message' => count($validated['product_ids']) . ' ürün için özellikler kaydedildi.',
        ]);
    }

    public function sendProducts(SendMarketplaceProductsRequest $request): JsonResponse
    {
        $credential = $this->getCredential();
        $productIds = collect($request->validated('product_ids'));

        $minStock = (int) $request->input('min_stock', 0);
        if ($minStock > 0) {
            $products = Product::with([
                'variants' => fn($q) => $q->where('is_active', true),
            ])
                ->whereIn('id', $productIds)
                ->get();

            $productIds = $products->filter(function ($p) use ($minStock) {
                $activeVariants = $p->variants->where('is_active', true);
                if ($activeVariants->isNotEmpty()) {
                    return $activeVariants->contains(fn($v) => $v->stock_quantity > $minStock);
                }

                return $p->stock_quantity > $minStock;
            })->pluck('id');
        }

        if ($productIds->isEmpty()) {
            return response()->json([
                'message' => 'Gönderilecek ürün bulunamadı.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $deliveryType = (int) Setting::get('ciceksepeti.delivery_type', 2);
        $deliveryMessageType = (int) Setting::get('ciceksepeti.delivery_message_type', 5);
        $priceOverrides = $request->input('price_overrides', []);

        // Çiçeksepeti max 1000 ürün/istek, 100'lük chunk'lar
        $chunks = $productIds->chunk(100);

        $jobs = $chunks->map(fn($chunk) =>
            new SendCiceksepetiProductsJob(
                $credential->id,
                $chunk->values()->toArray(),
                $deliveryType,
                $deliveryMessageType,
                $priceOverrides,
                $minStock,
            )
        );

        $batch = Bus::batch($jobs->toArray())
            ->name('ciceksepeti-send-' . now()->timestamp)
            ->dispatch();

        $totalCount = $productIds->count();
        $chunkCount = $chunks->count();

        return response()->json([
            'message' => "{$totalCount} ürün {$chunkCount} batch halinde kuyruğa eklendi.",
            'batchId' => $batch->id,
            'totalProducts' => $totalCount,
            'totalBatches' => $chunkCount,
        ]);
    }

    public function sendProgress(string $batchId): JsonResponse
    {
        $batch = Bus::findBatch($batchId);

        if (!$batch) {
            return response()->json([
                'message' => 'Batch bulunamadı.',
            ], Response::HTTP_NOT_FOUND);
        }

        return response()->json([
            'totalJobs' => $batch->totalJobs,
            'pendingJobs' => $batch->pendingJobs,
            'failedJobs' => $batch->failedJobs,
            'processedJobs' => $batch->processedJobs(),
            'progress' => $batch->progress(),
            'finished' => $batch->finished(),
            'cancelled' => $batch->cancelled(),
        ]);
    }

    // ==========================================
    // FİYAT & STOK
    // ==========================================

    public function updatePriceStock(UpdatePriceStockRequest $request): JsonResponse
    {
        $service = $this->getService();
        $formatter = new CiceksepetiProductFormatter();

        $variantOverrides = [];
        foreach ($request->validated('items') as $rawItem) {
            if (!empty($rawItem['variant_overrides']) && is_array($rawItem['variant_overrides'])) {
                foreach ($rawItem['variant_overrides'] as $variantId => $overridePrice) {
                    $variantOverrides[(int) $variantId] = (float) $overridePrice;
                }
            }
        }

        $items = [];
        foreach ($request->validated('items') as $item) {
            $product = Product::with([
                'variants' => fn($q) => $q->where('is_active', true),
            ])->find($item['product_id']);

            if (!$product) {
                continue;
            }

            if (!empty($item['variant_id'])) {
                $variant = $product->variants->firstWhere('id', $item['variant_id']);
                if (!$variant) {
                    continue;
                }

                if (isset($item['price'])) {
                    $variant->price = $item['price'];
                }
                if (isset($item['stock'])) {
                    $variant->stock_quantity = $item['stock'];
                }

                $stockCode = $variant->sku ?: $variant->barcode ?: ($product->sku ?: $product->barcode) . '-' . $variant->id;
                $salePrice = (float) ($variant->price ?? $product->price);

                $itemData = [
                    'stockCode' => $stockCode,
                    'stockQuantity' => $variant->stock_quantity,
                    'salesPrice' => $salePrice,
                ];

                $listPrice = (float) ($variant->compare_price ?? $product->compare_price ?? $salePrice);
                if ($listPrice > $salePrice) {
                    $itemData['listPrice'] = $listPrice;
                }

                $items[] = $itemData;
                continue;
            }

            if (isset($item['price'])) {
                $product->price = $item['price'];
            }
            if (isset($item['stock'])) {
                $product->stock_quantity = $item['stock'];
            }

            if (!empty($variantOverrides)) {
                foreach ($product->variants as $variant) {
                    if (isset($variantOverrides[$variant->id])) {
                        $variant->price = $variantOverrides[$variant->id];
                        if ($variant->compare_price !== null && (float) $variant->compare_price < $variantOverrides[$variant->id]) {
                            $variant->compare_price = $variantOverrides[$variant->id];
                        }
                    }
                }
            }

            $productItems = $formatter->formatPriceStockItems($product);
            $items = array_merge($items, $productItems);
        }

        if (empty($items)) {
            return response()->json([
                'message' => 'Güncellenecek ürün bulunamadı.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Çiçeksepeti max 200 item per request
        $chunks = array_chunk($items, 200);
        $batchIds = [];

        foreach ($chunks as $chunk) {
            $result = $service->updatePriceAndStock($chunk);
            if (!empty($result['batchId'])) {
                $batchIds[] = $result['batchId'];
            }
        }

        return response()->json([
            'message' => count($items) . ' ürünün fiyat/stok bilgisi güncellendi.',
            'batchIds' => $batchIds,
        ]);
    }

    public function bulkPricePreview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_ids' => ['required', 'array', 'min:1'],
            'product_ids.*' => ['exists:products,id'],
            'price_type' => ['required', 'in:fixed,percentage'],
            'price_value' => ['required', 'numeric'],
        ]);

        $products = Product::with([
            'variants' => fn($q) => $q->where('is_active', true),
        ])
            ->whereIn('id', $validated['product_ids'])
            ->get();

        $preview = [];
        foreach ($products as $product) {
            $activeVariants = $product->variants->where('is_active', true);

            if ($activeVariants->isNotEmpty()) {
                foreach ($activeVariants as $variant) {
                    $currentPrice = (float) ($variant->price ?? $product->price);
                    $newPrice = $this->calculateNewPrice($currentPrice, $validated['price_type'], (float) $validated['price_value']);

                    $preview[] = [
                        'productId' => $product->id,
                        'variantId' => $variant->id,
                        'productName' => $product->name,
                        'variantInfo' => $variant->variantValues->map(fn($vv) => $vv->variantOption?->value)->filter()->implode(' / '),
                        'currentPrice' => $currentPrice,
                        'newPrice' => $newPrice,
                    ];
                }
            } else {
                $currentPrice = (float) $product->price;
                $newPrice = $this->calculateNewPrice($currentPrice, $validated['price_type'], (float) $validated['price_value']);

                $preview[] = [
                    'productId' => $product->id,
                    'variantId' => null,
                    'productName' => $product->name,
                    'variantInfo' => null,
                    'currentPrice' => $currentPrice,
                    'newPrice' => $newPrice,
                ];
            }
        }

        return response()->json(['data' => $preview]);
    }

    // ==========================================
    // BATCH TAKİP
    // ==========================================

    public function batchStatus(string $batchId): JsonResponse
    {
        $service = $this->getService();
        $result = $service->getBatchStatus($batchId);

        return response()->json(['data' => $result]);
    }

    public function batchResults(): JsonResponse
    {
        $batches = MarketplaceProduct::where('marketplace', 'ciceksepeti')
            ->whereNotNull('batch_request_id')
            ->select(
                'batch_request_id',
                DB::raw('COUNT(*) as total_items'),
                DB::raw("SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count"),
                DB::raw("SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count"),
                DB::raw("SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count"),
                DB::raw("SUM(CASE WHEN status = 'on_sale' THEN 1 ELSE 0 END) as on_sale_count"),
                DB::raw('MIN(created_at) as created_at'),
                DB::raw('MAX(updated_at) as updated_at'),
            )
            ->groupBy('batch_request_id')
            ->orderByDesc(DB::raw('MAX(updated_at)'))
            ->limit(10)
            ->get();

        foreach ($batches as $batch) {
            if ($batch->rejected_count > 0) {
                $batch->errors = MarketplaceProduct::where('marketplace', 'ciceksepeti')
                    ->where('batch_request_id', $batch->batch_request_id)
                    ->where('status', 'rejected')
                    ->whereNotNull('error_message')
                    ->join('products', 'marketplace_products.product_id', '=', 'products.id')
                    ->select(
                        'marketplace_products.id',
                        'marketplace_products.product_id',
                        'marketplace_products.error_message',
                        'products.name as product_name',
                        'products.barcode as product_barcode',
                    )
                    ->limit(20)
                    ->get();
            } else {
                $batch->errors = [];
            }

            $batch->products = MarketplaceProduct::where('marketplace', 'ciceksepeti')
                ->where('batch_request_id', $batch->batch_request_id)
                ->join('products', 'marketplace_products.product_id', '=', 'products.id')
                ->select(
                    'marketplace_products.product_id',
                    'marketplace_products.status',
                    'products.name as product_name',
                )
                ->get();
        }

        return response()->json(['data' => $batches]);
    }

    public function checkBatchFromCS(string $batchId): JsonResponse
    {
        $service = $this->getService();

        try {
            $result = $service->getBatchStatus($batchId);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Çiçeksepeti API hatası: ' . $e->getMessage(),
            ], Response::HTTP_BAD_GATEWAY);
        }

        $items = $result['items'] ?? [];
        $updated = 0;

        foreach ($items as $item) {
            $status = $item['status'] ?? '';
            $stockCode = $item['data']['stockCode'] ?? null;

            if (!$stockCode) {
                continue;
            }

            $newStatus = match ($status) {
                'Success' => 'approved',
                'Failed' => 'rejected',
                'Pending', 'Processing' => 'pending',
                default => null,
            };

            if (!$newStatus) {
                continue;
            }

            $errorMessage = null;
            if ($status === 'Failed') {
                $reasons = collect($item['failureReasons'] ?? [])
                    ->pluck('message')
                    ->filter()
                    ->implode('; ');
                $errorMessage = $reasons ?: 'Bilinmeyen hata';
            }

            // stockCode ile eşleşen marketplace_product'ı bul
            $mpProducts = MarketplaceProduct::where('marketplace', 'ciceksepeti')
                ->where('batch_request_id', $batchId)
                ->get();

            foreach ($mpProducts as $mpProduct) {
                $mpProduct->update([
                    'status' => $newStatus,
                    'error_message' => $errorMessage,
                ]);
                $updated++;
            }
        }

        return response()->json([
            'message' => "{$updated} ürün durumu güncellendi.",
            'data' => $result,
        ]);
    }

    // ==========================================
    // STOK SENK
    // ==========================================

    public function syncStock(): JsonResponse
    {
        $credential = $this->getCredential();

        CiceksepetiStockSyncJob::dispatch($credential->id);

        return response()->json([
            'message' => 'Stok senk işlemi başladı.',
        ], Response::HTTP_ACCEPTED);
    }

    public function stockSyncResults(): JsonResponse
    {
        $logs = MarketplaceStockSyncLog::where('marketplace', 'ciceksepeti')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'data' => $logs->map(fn($l) => [
                'id' => $l->id,
                'totalProducts' => $l->total_products,
                'stockChanged' => $l->stock_changed,
                'apiCalls' => $l->api_calls,
                'failed' => $l->failed,
                'durationSeconds' => $l->duration_seconds,
                'batchRequestIds' => $l->batch_request_ids,
                'errorLog' => $l->error_log,
                'startedAt' => $l->started_at?->toISOString(),
                'completedAt' => $l->completed_at?->toISOString(),
            ]),
        ]);
    }

    // ==========================================
    // YARDIMCI
    // ==========================================

    protected function calculateNewPrice(float $currentPrice, string $type, float $value): float
    {
        if ($type === 'fixed') {
            return round(max(0.01, $value), 2);
        }

        // percentage
        $newPrice = $currentPrice * (1 + $value / 100);

        return round(max(0.01, $newPrice), 2);
    }

    protected function turkishLower(string $str): string
    {
        $str = str_replace("\xC4\xB0", 'i', $str);
        $str = mb_strtolower($str, 'UTF-8');
        $str = str_replace("i\xCC\x87", 'i', $str);

        return $str;
    }
}
