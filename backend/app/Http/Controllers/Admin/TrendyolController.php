<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkPriceUpdateRequest;
use App\Http\Requests\SendMarketplaceProductsRequest;
use App\Http\Requests\UpdatePriceStockRequest;
use App\Http\Resources\MarketplaceCategoryResource;
use App\Http\Resources\MarketplaceProductResource;
use App\Jobs\Marketplace\SendTrendyolProductsJob;
use App\Jobs\Marketplace\SyncTrendyolCategoriesJob;
use App\Models\MarketplaceBrandMapping;
use App\Models\MarketplaceCargoCompany;
use App\Models\Brand;
use App\Models\MarketplaceCategory;
use App\Models\MarketplaceCategoryMapping;
use App\Models\Category;
use App\Models\MarketplaceCredential;
use App\Models\MarketplaceProduct;
use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\Setting;
use App\Models\MarketplaceStockSyncLog;
use App\Services\Marketplace\TrendyolApiService;
use App\Services\Marketplace\TrendyolProductFormatter;
use App\Services\Marketplace\TrendyolProductImportService;
use App\Services\Marketplace\TrendyolStockSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class TrendyolController extends Controller
{
    protected function getService(): TrendyolApiService
    {
        $credential = MarketplaceCredential::where('marketplace', 'trendyol')
            ->where('is_active', true)
            ->firstOrFail();

        return new TrendyolApiService($credential);
    }

    protected function getCredential(): MarketplaceCredential
    {
        return MarketplaceCredential::where('marketplace', 'trendyol')
            ->where('is_active', true)
            ->firstOrFail();
    }

    // ==========================================
    // KATEGORI
    // ==========================================

    public function syncCategories(): JsonResponse
    {
        $credential = $this->getCredential();

        SyncTrendyolCategoriesJob::dispatch($credential->id);

        return response()->json([
            'message' => 'Kategori senk işlemi başladı.',
        ], Response::HTTP_ACCEPTED);
    }

    public function categories(Request $request): JsonResponse
    {
        $query = MarketplaceCategory::where('marketplace', 'trendyol');

        if ($request->has('search')) {
            $query->where('category_name', 'like', '%' . $request->input('search') . '%');
        }

        // Ağaç yapısı — üst kategorileri getir (recursive)
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

    public function categoryMappings(): JsonResponse
    {
        $mappings = MarketplaceCategoryMapping::where('marketplace', 'trendyol')
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

    public function updateCategoryMapping(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'local_category_id' => ['required', 'exists:categories,id'],
            'marketplace_category_id' => ['required', 'exists:marketplace_categories,id'],
        ]);

        $mapping = MarketplaceCategoryMapping::updateOrCreate(
            [
                'marketplace' => 'trendyol',
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

    // ==========================================
    // MARKA
    // ==========================================

    public function syncBrands(): JsonResponse
    {
        $service = $this->getService();
        $count = $service->syncBrands();

        return response()->json([
            'message' => "Marka senk tamamlandı. {$count} marka.",
        ], Response::HTTP_ACCEPTED);
    }

    public function brands(Request $request): JsonResponse
    {
        $query = MarketplaceBrandMapping::where('marketplace', 'trendyol')
            ->with('brand');

        if ($request->has('search')) {
            $query->where('marketplace_brand_name', 'like', '%' . $request->input('search') . '%');
        }

        if ($request->boolean('matched')) {
            $query->whereNotNull('local_brand_id');
        }

        $brands = $query->paginate($request->input('per_page', 50));

        return response()->json([
            'data' => $brands->map(fn($b) => [
                'id' => $b->id,
                'localBrandId' => $b->local_brand_id,
                'marketplaceBrandId' => $b->marketplace_brand_id,
                'marketplaceBrandName' => $b->marketplace_brand_name,
                'brand' => $b->brand ? [
                    'id' => $b->brand->id,
                    'name' => $b->brand->name,
                ] : null,
            ]),
            'meta' => [
                'current_page' => $brands->currentPage(),
                'last_page' => $brands->lastPage(),
                'per_page' => $brands->perPage(),
                'total' => $brands->total(),
            ],
        ]);
    }

    public function searchBrand(Request $request): JsonResponse
    {
        $name = $request->input('name', '');

        if (strlen($name) < 2) {
            return response()->json(['data' => []]);
        }

        $service = $this->getService();
        $brands = $service->searchBrand($name);

        return response()->json(['data' => $brands]);
    }

    public function updateBrandMapping(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'local_brand_id' => ['required', 'exists:brands,id'],
            'marketplace_brand_id' => ['required', 'integer'],
            'marketplace_brand_name' => ['required', 'string'],
        ]);

        MarketplaceBrandMapping::updateOrCreate(
            [
                'marketplace' => 'trendyol',
                'local_brand_id' => $validated['local_brand_id'],
            ],
            [
                'marketplace_brand_id' => $validated['marketplace_brand_id'],
                'marketplace_brand_name' => $validated['marketplace_brand_name'],
            ]
        );

        return response()->json(['message' => 'Marka eşleştirmesi kaydedildi.']);
    }

    // ==========================================
    // KARGO
    // ==========================================

    public function syncCargoCompanies(): JsonResponse
    {
        $service = $this->getService();
        $count = $service->syncCargoCompanies();

        return response()->json([
            'message' => "Kargo şirketleri senk edildi. {$count} şirket.",
        ]);
    }

    public function cargoCompanies(): JsonResponse
    {
        $companies = MarketplaceCargoCompany::where('marketplace', 'trendyol')->get();

        return response()->json([
            'data' => $companies->map(fn($c) => [
                'id' => $c->id,
                'marketplace' => $c->marketplace,
                'cargoCompanyId' => (string) $c->cargo_company_id,
                'cargoCompanyName' => $c->cargo_company_name,
                'isDefault' => $c->is_default,
            ]),
        ]);
    }

    public function setDefaultCargoCompany(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cargo_company_id' => ['required', 'string'],
        ]);

        // Tüm trendyol kargo şirketlerinin default'unu kaldır
        MarketplaceCargoCompany::where('marketplace', 'trendyol')
            ->update(['is_default' => false]);

        // Seçileni default yap
        $company = MarketplaceCargoCompany::where('marketplace', 'trendyol')
            ->where('cargo_company_id', $validated['cargo_company_id'])
            ->firstOrFail();

        $company->update(['is_default' => true]);

        return response()->json([
            'message' => "Varsayılan kargo şirketi '{$company->cargo_company_name}' olarak ayarlandı.",
        ]);
    }

    // ==========================================
    // ÜRÜN
    // ==========================================

    /**
     * Yerel ürünleri pazaryeri hazırlık bilgileriyle listeler.
     */
    public function localProducts(Request $request): JsonResponse
    {
        $query = Product::where('is_active', true)
            ->with([
                'images', 'brand', 'category',
                'variants' => fn ($q) => $q->where('is_active', true),
                'variants.variantValues.variantOption.variantType',
            ])
            ->withCount(['variants' => fn ($q) => $q->where('is_active', true)]);

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
            // Include this category and all descendant categories
            $categoryIds = collect([$catId]);
            $parentIds = collect([$catId]);
            while ($parentIds->isNotEmpty()) {
                $childIds = \App\Models\Category::whereIn('parent_id', $parentIds)->pluck('id');
                $categoryIds = $categoryIds->merge($childIds);
                $parentIds = $childIds;
            }
            $query->whereIn('category_id', $categoryIds->unique());
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->input('brand_id'));
        }

        // Stok filtresi
        $stockStatus = $request->input('stock_status');
        if ($stockStatus === 'in_stock') {
            $query->where(function ($q) {
                $q->where('stock_quantity', '>', 0)
                    ->orWhereHas('variants', fn ($vq) =>
                        $vq->where('is_active', true)->where('stock_quantity', '>', 0)
                    );
            });
        } elseif ($stockStatus === 'out_of_stock') {
            $query->where('stock_quantity', '<=', 0)
                ->whereDoesntHave('variants', fn ($vq) =>
                    $vq->where('is_active', true)->where('stock_quantity', '>', 0)
                );
        }

        // Varyant filtresi
        $hasVariants = $request->input('has_variants');
        if ($hasVariants === 'yes') {
            $query->whereHas('variants', fn ($q) => $q->where('is_active', true));
        } elseif ($hasVariants === 'no') {
            $query->whereDoesntHave('variants', fn ($q) => $q->where('is_active', true));
        }

        $mpStatus = $request->input('mp_status');
        if ($mpStatus === 'not_sent') {
            $query->whereDoesntHave('marketplaceProducts', fn($q) =>
                $q->where('marketplace', 'trendyol'));
        } elseif ($mpStatus && $mpStatus !== 'all') {
            $query->whereHas('marketplaceProducts', fn($q) =>
                $q->where('marketplace', 'trendyol')->where('status', $mpStatus));
        }

        // Hazırlık filtresi — paginate öncesi uygulanacak (post-query değil)
        // readiness = barcode + images + category mapping + brand mapping
        // Bu filtre mapping bilgisine bağlı olduğu için sayfalama sonrası filtre yapmak yerine
        // sub-query ile mapping kontrolu yapariz.
        $readiness = $request->input('readiness');
        if ($readiness === 'ready') {
            $query->where('barcode', '!=', '')
                ->whereNotNull('barcode')
                ->whereHas('images')
                ->whereHas('category', function ($q) {
                    $q->whereIn('categories.id', function ($sub) {
                        $sub->select('local_category_id')
                            ->from('marketplace_category_mappings')
                            ->where('marketplace', 'trendyol');
                    });
                })
                ->where(function ($q) {
                    $q->whereNull('brand_id')
                        ->orWhereIn('brand_id', function ($sub) {
                            $sub->select('local_brand_id')
                                ->from('marketplace_brand_mappings')
                                ->where('marketplace', 'trendyol')
                                ->whereNotNull('local_brand_id');
                        });
                });
        } elseif ($readiness === 'not_ready') {
            $query->where(function ($q) {
                $q->where(function ($q2) {
                    $q2->where('barcode', '')->orWhereNull('barcode');
                })
                ->orWhereDoesntHave('images')
                ->orWhereDoesntHave('category', function ($q2) {
                    $q2->whereIn('categories.id', function ($sub) {
                        $sub->select('local_category_id')
                            ->from('marketplace_category_mappings')
                            ->where('marketplace', 'trendyol');
                    });
                })
                ->orWhere(function ($q2) {
                    $q2->whereNotNull('brand_id')
                        ->whereNotIn('brand_id', function ($sub) {
                            $sub->select('local_brand_id')
                                ->from('marketplace_brand_mappings')
                                ->where('marketplace', 'trendyol')
                                ->whereNotNull('local_brand_id');
                        });
                });
            });
        }

        $products = $query->orderBy('name')
            ->paginate($request->input('per_page', 20));

        $productIds = $products->pluck('id');
        $mpProducts = MarketplaceProduct::where('marketplace', 'trendyol')
            ->whereIn('product_id', $productIds)
            ->get()
            ->keyBy('product_id');

        $categoryIds = $products->pluck('category_id')->unique();
        $categoryMappings = MarketplaceCategoryMapping::where('marketplace', 'trendyol')
            ->whereIn('local_category_id', $categoryIds)
            ->pluck('local_category_id')
            ->toArray();

        $brandIds = $products->pluck('brand_id')->unique()->filter();
        $brandMappings = MarketplaceBrandMapping::where('marketplace', 'trendyol')
            ->whereIn('local_brand_id', $brandIds)
            ->pluck('local_brand_id')
            ->toArray();

        $data = $products->map(function ($product) use ($mpProducts, $categoryMappings, $brandMappings) {
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
                'hasBrandMapping' => $product->brand_id ? in_array($product->brand_id, $brandMappings) : false,
                'hasBarcode' => !empty($product->barcode),
                'hasImages' => $product->images->count() > 0,
                'hasVariants' => $product->variants_count > 0,
                'variantCount' => $product->variants_count,
                'variants' => $activeVariants->map(fn ($v) => [
                    'id' => $v->id,
                    'barcode' => $v->barcode,
                    'sku' => $v->sku,
                    'price' => (float) ($v->price ?? $product->price),
                    'comparePrice' => $v->compare_price ? (float) $v->compare_price : null,
                    'stockQuantity' => $v->stock_quantity,
                    'values' => $v->variantValues->map(fn ($vv) => [
                        'typeName' => $vv->variantOption?->variantType?->name,
                        'value' => $vv->variantOption?->value,
                    ])->filter(fn ($val) => $val['typeName'])->values()->toArray(),
                ])->values()->toArray(),
                'marketplaceStatus' => $mp?->status,
                'marketplaceProductId' => $mp?->marketplace_product_id,
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

        // Stok filtresi
        $stockStatus = $request->input('stock_status');
        if ($stockStatus === 'in_stock') {
            $query->where(function ($q) {
                $q->where('stock_quantity', '>', 0)
                    ->orWhereHas('variants', fn ($vq) =>
                        $vq->where('is_active', true)->where('stock_quantity', '>', 0)
                    );
            });
        } elseif ($stockStatus === 'out_of_stock') {
            $query->where('stock_quantity', '<=', 0)
                ->whereDoesntHave('variants', fn ($vq) =>
                    $vq->where('is_active', true)->where('stock_quantity', '>', 0)
                );
        }

        $hasVariants = $request->input('has_variants');
        if ($hasVariants === 'yes') {
            $query->whereHas('variants', fn ($q) => $q->where('is_active', true));
        } elseif ($hasVariants === 'no') {
            $query->whereDoesntHave('variants', fn ($q) => $q->where('is_active', true));
        }

        $mpStatus = $request->input('mp_status');
        if ($mpStatus === 'not_sent') {
            $query->whereDoesntHave('marketplaceProducts', fn($q) =>
                $q->where('marketplace', 'trendyol'));
        } elseif ($mpStatus && $mpStatus !== 'all') {
            $query->whereHas('marketplaceProducts', fn($q) =>
                $q->where('marketplace', 'trendyol')->where('status', $mpStatus));
        }

        $readiness = $request->input('readiness');
        if ($readiness === 'ready') {
            $query->where('barcode', '!=', '')
                ->whereNotNull('barcode')
                ->whereHas('images')
                ->whereHas('category', function ($q) {
                    $q->whereIn('categories.id', function ($sub) {
                        $sub->select('local_category_id')
                            ->from('marketplace_category_mappings')
                            ->where('marketplace', 'trendyol');
                    });
                })
                ->where(function ($q) {
                    $q->whereNull('brand_id')
                        ->orWhereIn('brand_id', function ($sub) {
                            $sub->select('local_brand_id')
                                ->from('marketplace_brand_mappings')
                                ->where('marketplace', 'trendyol')
                                ->whereNotNull('local_brand_id');
                        });
                });
        } elseif ($readiness === 'not_ready') {
            $query->where(function ($q) {
                $q->where(function ($q2) {
                    $q2->where('barcode', '')->orWhereNull('barcode');
                })
                ->orWhereDoesntHave('images')
                ->orWhereDoesntHave('category', function ($q2) {
                    $q2->whereIn('categories.id', function ($sub) {
                        $sub->select('local_category_id')
                            ->from('marketplace_category_mappings')
                            ->where('marketplace', 'trendyol');
                    });
                })
                ->orWhere(function ($q2) {
                    $q2->whereNotNull('brand_id')
                        ->whereNotIn('brand_id', function ($sub) {
                            $sub->select('local_brand_id')
                                ->from('marketplace_brand_mappings')
                                ->where('marketplace', 'trendyol')
                                ->whereNotNull('local_brand_id');
                        });
                });
            });
        }

        $ids = $query->pluck('id');

        return response()->json([
            'ids' => $ids,
            'total' => $ids->count(),
        ]);
    }

    public function products(Request $request): JsonResponse
    {
        $query = MarketplaceProduct::where('marketplace', 'trendyol')
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

    /**
     * Seçilen ürünleri kategori bazlı gruplayarak özellik bilgilerini döner.
     */
    public function prepareSend(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_ids' => ['required', 'array', 'min:1'],
            'product_ids.*' => ['exists:products,id'],
        ]);

        $products = Product::with([
            'images', 'brand', 'category', 'attributes',
            'variants' => fn ($q) => $q->where('is_active', true),
            'variants.variantValues.variantOption.variantType',
        ])
            ->whereIn('id', $validated['product_ids'])
            ->get();

        // Kategori bazlı grupla
        $grouped = $products->groupBy('category_id');

        $zeroStockProductIds = [];
        $categoryGroups = [];

        foreach ($grouped as $categoryId => $categoryProducts) {
            if (! $categoryId) {
                continue;
            }

            $mapping = MarketplaceCategoryMapping::where('marketplace', 'trendyol')
                ->where('local_category_id', $categoryId)
                ->with('marketplaceCategory')
                ->first();

            // Kategori özelliklerini al
            $categoryAttributes = [];
            $marketplaceCategoryId = null;
            $marketplaceCategoryName = null;

            if ($mapping?->marketplaceCategory) {
                $marketplaceCategoryId = $mapping->marketplaceCategory->marketplace_category_id;
                $marketplaceCategoryName = $mapping->marketplaceCategory->category_name;

                $storedAttributes = $mapping->marketplaceCategory->attributes;
                if (! empty($storedAttributes)) {
                    $categoryAttributes = $storedAttributes;
                } else {
                    try {
                        $service = $this->getService();
                        $categoryAttributes = $service->getCategoryAttributes($marketplaceCategoryId);
                    } catch (\Exception) {
                        // Özellik alınamazsa devam et
                    }
                }
            }

            // Ürünlerin variant type adlarını topla
            $allVariantTypeNames = [];
            foreach ($categoryProducts as $product) {
                $activeVariants = $product->variants->where('is_active', true);
                foreach ($activeVariants as $variant) {
                    $variantValues = $variant->relationLoaded('variantValues')
                        ? $variant->variantValues
                        : $variant->variantValues()->with('variantOption.variantType')->get();

                    foreach ($variantValues as $vv) {
                        $typeName = $vv->variantOption?->variantType?->name;
                        if ($typeName) {
                            $allVariantTypeNames[$this->turkishLower($typeName)] = $typeName;
                        }
                    }
                }
            }

            // Attribute'ları işle — autoMatch kontrolü
            $processedAttributes = [];
            foreach ($categoryAttributes as $attr) {
                $attrName = $attr['attribute']['name'] ?? $attr['name'] ?? '';
                $attrNameLower = $this->turkishLower($attrName);
                $isSlicer = $attr['slicer'] ?? false;
                $isVarianter = $attr['varianter'] ?? false;

                $processed = $attr;
                $processed['autoMatched'] = false;
                $processed['autoMatchSource'] = null;
                $processed['existingValue'] = null;

                if ($isSlicer || $isVarianter) {
                    // Varyant ile eşleşme kontrolü
                    if (isset($allVariantTypeNames[$attrNameLower])) {
                        $processed['autoMatched'] = true;
                        $processed['autoMatchSource'] = 'variant';
                    }
                }

                $processedAttributes[] = $processed;
            }

            // Ürün bilgilerini hazırla
            $productData = [];
            foreach ($categoryProducts as $product) {
                $activeVariants = $product->variants->where('is_active', true);
                $totalStock = $activeVariants->isNotEmpty()
                    ? $activeVariants->sum('stock_quantity')
                    : $product->stock_quantity;

                if ($totalStock <= 0) {
                    $zeroStockProductIds[] = $product->id;
                }

                // Ürünün variant type adlarını topla
                $variantTypes = [];
                foreach ($activeVariants as $variant) {
                    $variantValues = $variant->relationLoaded('variantValues')
                        ? $variant->variantValues
                        : $variant->variantValues()->with('variantOption.variantType')->get();

                    foreach ($variantValues as $vv) {
                        $typeName = $vv->variantOption?->variantType?->name;
                        if ($typeName && ! in_array($typeName, $variantTypes)) {
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
                    'existingAttributes' => $this->buildExistingAttributesWithColorDetect($product),
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
                'categoryAttributes' => $processedAttributes,
            ];
        }

        return response()->json([
            'categoryGroups' => $categoryGroups,
            'zeroStockProductIds' => array_values(array_unique($zeroStockProductIds)),
        ]);
    }

    /**
     * Tek ürün için attribute kaydet.
     */
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

            // Gelen isimlerdeki mevcut kayıtları sil
            ProductAttribute::where('product_id', $productId)
                ->whereIn('attribute_name', $attrNames)
                ->delete();

            // Yenilerini insert
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

    /**
     * Birden fazla ürün için toplu attribute kaydet.
     */
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

        // Kritik stok filtresi — ürün seviyesinde ön eleme (tüm varyantları eşik altı olanlar)
        // Varyant bazlı ince filtreleme job içinde yapılır
        $minStock = (int) $request->input('min_stock', 0);
        if ($minStock > 0) {
            $products = Product::with([
                'variants' => fn ($q) => $q->where('is_active', true),
            ])
                ->whereIn('id', $productIds)
                ->get();

            $productIds = $products->filter(function ($p) use ($minStock) {
                $activeVariants = $p->variants->where('is_active', true);
                if ($activeVariants->isNotEmpty()) {
                    // En az 1 varyantı eşik üstündeyse ürünü gönder (varyant filtresi job'da)
                    return $activeVariants->contains(fn ($v) => $v->stock_quantity > $minStock);
                }

                return $p->stock_quantity > $minStock;
            })->pluck('id');
        }

        if ($productIds->isEmpty()) {
            return response()->json([
                'message' => 'Gönderilecek ürün bulunamadı.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $defaultCargo = MarketplaceCargoCompany::where('marketplace', 'trendyol')
            ->where('is_default', true)
            ->first();

        $cargoCompanyId = $defaultCargo?->cargo_company_id ?? 0;

        // Fiyat override'ları (toplu fiyat güncellemeden gelebilir)
        $priceOverrides = $request->input('price_overrides', []);

        Log::info('sendProducts: price_overrides', [
            'has_overrides' => ! empty($priceOverrides),
            'override_count' => is_array($priceOverrides) ? count($priceOverrides) : 0,
            'overrides' => $priceOverrides,
            'product_ids' => $productIds->toArray(),
        ]);

        // Ürünleri 100'lük chunk'lara böl ve her chunk için job oluştur
        $chunks = $productIds->chunk(100);

        $jobs = $chunks->map(fn ($chunk) =>
            new SendTrendyolProductsJob($credential->id, $chunk->values()->toArray(), $cargoCompanyId, $priceOverrides, $minStock)
        );

        $batch = Bus::batch($jobs->toArray())
            ->name('trendyol-send-' . now()->timestamp)
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

        if (! $batch) {
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

    public function updateProducts(SendMarketplaceProductsRequest $request): JsonResponse
    {
        $service = $this->getService();
        $formatter = new TrendyolProductFormatter();

        $products = Product::with([
            'images', 'brand', 'category', 'attributes',
            'variants' => fn ($q) => $q->where('is_active', true),
            'variants.images',
        ])
            ->whereIn('id', $request->validated('product_ids'))
            ->get();

        $items = [];
        foreach ($products as $product) {
            $mpProduct = MarketplaceProduct::where('marketplace', 'trendyol')
                ->where('product_id', $product->id)
                ->first();

            if (! $mpProduct) {
                continue;
            }

            $productItems = $formatter->formatProductUpdateItems($product, $mpProduct);
            $items = array_merge($items, $productItems);
        }

        if (empty($items)) {
            return response()->json([
                'message' => 'Güncellenecek ürün bulunamadı.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $result = $service->updateProducts($items);

        return response()->json([
            'message' => count($items) . ' ürün güncellendi.',
            'batchRequestId' => $result['batchRequestId'],
        ]);
    }

    public function updatePriceStock(UpdatePriceStockRequest $request): JsonResponse
    {
        $service = $this->getService();
        $formatter = new TrendyolProductFormatter();

        // Tüm item'lardan gelen varyant override'larını topla (toplu fiyat güncellemeden)
        $variantOverrides = [];
        foreach ($request->validated('items') as $rawItem) {
            if (! empty($rawItem['variant_overrides']) && is_array($rawItem['variant_overrides'])) {
                foreach ($rawItem['variant_overrides'] as $variantId => $overridePrice) {
                    $variantOverrides[(int) $variantId] = (float) $overridePrice;
                }
            }
        }

        $items = [];
        foreach ($request->validated('items') as $item) {
            $product = Product::with([
                'variants' => fn ($q) => $q->where('is_active', true),
            ])->find($item['product_id']);

            if (! $product) {
                continue;
            }

            // Belirli bir varyant hedefleniyorsa sadece o varyantı güncelle
            if (! empty($item['variant_id'])) {
                $variant = $product->variants->firstWhere('id', $item['variant_id']);
                if (! $variant) {
                    continue;
                }

                if (isset($item['price'])) {
                    $variant->price = $item['price'];
                }
                if (isset($item['stock'])) {
                    $variant->stock_quantity = $item['stock'];
                }

                $salePrice = (float) ($variant->price ?? $product->price);
                $items[] = [
                    'barcode' => $variant->barcode ?? $product->barcode,
                    'quantity' => $variant->stock_quantity,
                    'salePrice' => $salePrice,
                    'listPrice' => (float) ($variant->compare_price ?? $product->compare_price ?? $salePrice),
                ];

                continue;
            }

            // Geçici fiyat/stok override (in-memory, DB'ye yazılmaz)
            if (isset($item['price'])) {
                $product->price = $item['price'];
            }
            if (isset($item['stock'])) {
                $product->stock_quantity = $item['stock'];
            }

            // Varyant override'ları varsa in-memory uygula
            if (! empty($variantOverrides)) {
                foreach ($product->variants as $variant) {
                    if (isset($variantOverrides[$variant->id])) {
                        $variant->price = $variantOverrides[$variant->id];
                        // listPrice >= salePrice kuralı
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

        $result = $service->updatePriceAndStock($items);

        return response()->json([
            'message' => count($items) . ' ürünün fiyat/stok bilgisi güncellendi.',
            'batchRequestId' => $result['batchRequestId'],
        ]);
    }

    public function batchStatus(string $batchRequestId): JsonResponse
    {
        $service = $this->getService();
        $result = $service->getBatchStatus($batchRequestId);

        return response()->json(['data' => $result]);
    }

    /**
     * Son gönderim batch'lerini listeler (marketplace_products gruplayarak).
     */
    public function batchResults(): JsonResponse
    {
        $batches = MarketplaceProduct::where('marketplace', 'trendyol')
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

        // Attach error details & product names for rejected items
        foreach ($batches as $batch) {
            if ($batch->rejected_count > 0) {
                $batch->errors = MarketplaceProduct::where('marketplace', 'trendyol')
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

            // Attach product names for the batch
            $batch->products = MarketplaceProduct::where('marketplace', 'trendyol')
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

    /**
     * Trendyol API'den batch durumunu sorgular ve local kayıtları günceller.
     */
    public function checkBatchFromTrendyol(string $batchRequestId): JsonResponse
    {
        $service = $this->getService();

        try {
            $result = $service->getBatchStatus($batchRequestId);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Trendyol API hatası: ' . $e->getMessage(),
            ], Response::HTTP_BAD_GATEWAY);
        }

        $items = $result['items'] ?? [];

        // Group Trendyol items by productMainId (all variants of same product share this)
        $grouped = [];
        foreach ($items as $item) {
            $productMainId = $item['requestItem']['product']['productMainId']
                ?? $item['requestItem']['productMainId']
                ?? null;
            $barcode = $item['requestItem']['barcode']
                ?? $item['requestItem']['product']['barcode']
                ?? null;

            if (! $productMainId && ! $barcode) {
                continue;
            }

            $key = $productMainId ?: $barcode;
            if (! isset($grouped[$key])) {
                $grouped[$key] = ['items' => [], 'barcodes' => []];
            }
            $grouped[$key]['items'][] = $item;
            if ($barcode) {
                $grouped[$key]['barcodes'][] = $barcode;
            }
        }

        $successCount = 0;
        $failCount = 0;
        $failedItems = [];

        // Get all marketplace_products for this batch
        $mpProducts = MarketplaceProduct::where('marketplace', 'trendyol')
            ->where('batch_request_id', $batchRequestId)
            ->with('product:id,barcode,sku,name')
            ->get();

        foreach ($mpProducts as $mpProduct) {
            $product = $mpProduct->product;
            if (! $product) {
                continue;
            }

            // Match by SKU or barcode (productMainId = sku ?? barcode)
            $productMainId = $product->sku ?? $product->barcode;
            $group = $grouped[$productMainId] ?? $grouped[$product->barcode] ?? null;

            if (! $group) {
                // Try matching by variant barcodes
                $variantBarcodes = $product->variants()->pluck('barcode')->filter()->toArray();
                foreach ($grouped as $key => $g) {
                    if (array_intersect($g['barcodes'], $variantBarcodes)) {
                        $group = $g;
                        break;
                    }
                }
            }

            if (! $group) {
                continue;
            }

            // Check statuses of all items in the group
            $allSuccess = true;
            $reasons = [];

            foreach ($group['items'] as $item) {
                $status = $item['status'] ?? '';
                if ($status !== 'SUCCESS') {
                    $allSuccess = false;
                    // failureReasons can be array of strings or array of objects
                    foreach ($item['failureReasons'] ?? [] as $reason) {
                        $msg = is_string($reason) ? $reason : ($reason['message'] ?? json_encode($reason));
                        if (! in_array($msg, $reasons)) {
                            $reasons[] = $msg;
                        }
                    }
                }
            }

            if ($allSuccess) {
                $mpProduct->update(['status' => 'approved', 'error_message' => null]);
                $successCount++;
            } else {
                $errorMsg = implode('; ', $reasons) ?: 'Bilinmeyen hata';
                $mpProduct->update(['status' => 'rejected', 'error_message' => $errorMsg]);
                $failCount++;
                $failedItems[] = [
                    'productName' => $product->name,
                    'barcode' => $product->barcode,
                    'reasons' => $errorMsg,
                    'failedVariants' => count(array_filter($group['items'], fn ($i) => ($i['status'] ?? '') !== 'SUCCESS')),
                    'totalVariants' => count($group['items']),
                ];
            }
        }

        return response()->json([
            'message' => "Trendyol kontrolü tamamlandı: {$successCount} ürün başarılı, {$failCount} ürün başarısız.",
            'successCount' => $successCount,
            'failCount' => $failCount,
            'failedItems' => $failedItems,
            'trendyolStatus' => $result['status'] ?? null,
            'trendyolItemCount' => count($items),
        ]);
    }

    // ==========================================
    // OTOMATİK KATEGORİ EŞLEŞTİRME
    // ==========================================

    /**
     * Türkçe İ/I karakter sorununu çözerek lowercase yapar.
     */
    protected function turkishLower(string $str): string
    {
        $str = str_replace("\xC4\xB0", 'i', $str); // İ -> i (before lowercase)
        $str = mb_strtolower($str, 'UTF-8');
        $str = str_replace("i\xCC\x87", 'i', $str); // combining dot above cleanup
        return $str;
    }

    /**
     * @return \Illuminate\Support\Collection<int, MarketplaceCategory> keyed by marketplace_category_id
     */
    protected function getTrendyolCategoryLookup(): \Illuminate\Support\Collection
    {
        return MarketplaceCategory::where('marketplace', 'trendyol')
            ->get()
            ->keyBy('marketplace_category_id');
    }

    /**
     * "Giyim > Kadın Ayakkabı > Topuklu" şeklinde tam kategori yolunu oluşturur.
     */
    protected function buildCategoryPath(MarketplaceCategory $category, \Illuminate\Support\Collection $lookup): string
    {
        $parts = [$category->category_name];
        $current = $category;

        while ($current->parent_id !== null) {
            $parent = $lookup->get($current->parent_id);
            if (!$parent) {
                break;
            }
            array_unshift($parts, $parent->category_name);
            $current = $parent;
        }

        return implode(' > ', $parts);
    }

    /**
     * Kategori adı + tam yol ile birlikte dizi döndürür.
     */
    protected function formatCategoryWithPath(MarketplaceCategory $category, \Illuminate\Support\Collection $lookup): array
    {
        $hasChildren = MarketplaceCategory::where('marketplace', 'trendyol')
            ->where('parent_id', $category->marketplace_category_id)
            ->exists();

        return [
            'id' => $category->id,
            'categoryName' => $category->category_name,
            'marketplaceCategoryId' => $category->marketplace_category_id,
            'path' => $this->buildCategoryPath($category, $lookup),
            'isLeaf' => !$hasChildren,
        ];
    }

    /**
     * Picker için Trendyol kategorilerini arar. Sadece yaprak kategorileri döndürür, tam yol ile.
     * Arama hem kategori adında hem de üst kategori yolunda (path) yapılır.
     * Tüm veri bellekte işlenir — 3.8k kategori için hızlı ve tek sorgu.
     */
    /**
     * Get cached leaf categories with pre-built paths for fast search.
     */
    protected function getCachedTrendyolLeafCategories(): array
    {
        return Cache::remember('trendyol_leaf_categories_with_paths', 60 * 60 * 24, function () {
            $allCategories = MarketplaceCategory::where('marketplace', 'trendyol')
                ->select('id', 'marketplace_category_id', 'category_name', 'parent_id')
                ->get();
            $lookup = $allCategories->keyBy('marketplace_category_id');
            $hasChildrenSet = $allCategories->pluck('parent_id')->filter()->unique()->flip();

            $leaves = [];
            foreach ($allCategories as $cat) {
                if ($hasChildrenSet->has($cat->marketplace_category_id)) {
                    continue;
                }
                $path = $this->buildCategoryPath($cat, $lookup);
                $leaves[] = [
                    'id' => $cat->id,
                    'categoryName' => $cat->category_name,
                    'marketplaceCategoryId' => $cat->marketplace_category_id,
                    'path' => $path,
                    'pathLower' => $this->turkishLower($path),
                    'nameLower' => $this->turkishLower($cat->category_name),
                    'isLeaf' => true,
                ];
            }

            usort($leaves, fn ($a, $b) => strcmp($a['path'], $b['path']));

            return $leaves;
        });
    }

    public function searchCategoriesForPicker(Request $request): JsonResponse
    {
        $search = $request->input('search', '');

        if (mb_strlen($search) < 2) {
            return response()->json(['data' => []]);
        }

        $searchLower = $this->turkishLower($search);
        $leaves = $this->getCachedTrendyolLeafCategories();

        $limit = 30;
        $exactResults = [];
        $fuzzyResults = [];

        $mapLeaf = fn ($leaf) => [
            'id' => $leaf['id'],
            'categoryName' => $leaf['categoryName'],
            'marketplaceCategoryId' => $leaf['marketplaceCategoryId'],
            'path' => $leaf['path'],
            'isLeaf' => true,
        ];

        // Pass 1: Exact substring matches (highest priority)
        foreach ($leaves as $leaf) {
            if (mb_strpos($leaf['pathLower'], $searchLower) !== false) {
                $exactResults[] = $mapLeaf($leaf);
            }
        }

        // Pass 2: Word-by-word fuzzy matches (only if we need more results)
        if (count($exactResults) < $limit) {
            $exactIds = array_column($exactResults, 'id');
            $exactIdSet = array_flip($exactIds);

            $words = array_filter(preg_split('/[\s]+/u', $searchLower));

            foreach ($leaves as $leaf) {
                if (count($exactResults) + count($fuzzyResults) >= $limit) {
                    break;
                }

                // Skip already-added exact matches
                if (isset($exactIdSet[$leaf['id']])) {
                    continue;
                }

                $pathLower = $leaf['pathLower'];
                $allWordsMatch = true;

                foreach ($words as $word) {
                    if (mb_strpos($pathLower, $word) !== false) {
                        continue;
                    }
                    // Only stem words longer than 5 chars (less aggressive)
                    if (mb_strlen($word) > 5) {
                        $stem = mb_substr($word, 0, -2);
                        if (mb_strpos($pathLower, $stem) !== false) {
                            continue;
                        }
                    }
                    $allWordsMatch = false;

                    break;
                }

                if ($allWordsMatch) {
                    $fuzzyResults[] = $mapLeaf($leaf);
                }
            }
        }

        // Exact matches first, then fuzzy, capped at limit
        $results = array_slice(array_merge($exactResults, $fuzzyResults), 0, $limit);

        return response()->json(['data' => $results]);
    }

    public function autoMatchCategories(): JsonResponse
    {
        $localLeaves = Category::whereDoesntHave('children')->get();
        $trendyolLeaves = $this->getCachedTrendyolLeafCategories();

        $existingMappings = MarketplaceCategoryMapping::where('marketplace', 'trendyol')
            ->pluck('local_category_id')
            ->toArray();

        $results = [];

        foreach ($localLeaves as $local) {
            if (in_array($local->id, $existingMappings)) {
                continue;
            }

            $suggestions = [];
            $normalizedLocal = $this->turkishLower(trim($local->name));

            foreach ($trendyolLeaves as $trendyol) {
                $score = $this->matchScore($normalizedLocal, $trendyol['nameLower']);

                if ($score >= 30) {
                    $suggestions[] = [
                        'trendyolCategory' => [
                            'id' => $trendyol['id'],
                            'categoryName' => $trendyol['categoryName'],
                            'marketplaceCategoryId' => $trendyol['marketplaceCategoryId'],
                            'path' => $trendyol['path'],
                            'isLeaf' => true,
                        ],
                        'score' => $score,
                    ];
                }
            }

            usort($suggestions, fn ($a, $b) => $b['score'] <=> $a['score']);
            $suggestions = array_slice($suggestions, 0, 3);

            $results[] = [
                'localCategory' => [
                    'id' => $local->id,
                    'name' => $local->name,
                ],
                'suggestions' => $suggestions,
            ];
        }

        return response()->json(['data' => $results]);
    }

    /**
     * Mevcut eşleştirmeleri tam yol ile döndürür.
     */
    public function categoryMappingsWithPath(): JsonResponse
    {
        $mappings = MarketplaceCategoryMapping::where('marketplace', 'trendyol')
            ->with(['category', 'marketplaceCategory'])
            ->get();

        // Build a minimal lookup containing only the ancestors needed for path building
        $neededParentIds = $mappings
            ->filter(fn($m) => $m->marketplaceCategory && $m->marketplaceCategory->parent_id)
            ->pluck('marketplaceCategory.parent_id')
            ->unique()
            ->values();

        $lookup = collect();
        $idsToFetch = $neededParentIds;

        while ($idsToFetch->isNotEmpty()) {
            $fetched = MarketplaceCategory::where('marketplace', 'trendyol')
                ->whereIn('marketplace_category_id', $idsToFetch)
                ->get()
                ->keyBy('marketplace_category_id');

            $lookup = $lookup->merge($fetched);

            $idsToFetch = $fetched
                ->pluck('parent_id')
                ->filter()
                ->reject(fn($id) => $lookup->has($id))
                ->unique()
                ->values();
        }

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
                    'path' => $this->buildCategoryPath($m->marketplaceCategory, $lookup),
                ] : null,
            ]),
        ]);
    }

    protected function matchScore(string $localName, string $trendyolName): int
    {
        if ($localName === $trendyolName) {
            return 100;
        }

        if (mb_strpos($trendyolName, $localName) !== false || mb_strpos($localName, $trendyolName) !== false) {
            return 85;
        }

        $localWords = array_filter(preg_split('/[\s\-_\/&,]+/u', $localName));
        $trendyolWords = array_filter(preg_split('/[\s\-_\/&,]+/u', $trendyolName));

        if (!empty($localWords) && !empty($trendyolWords)) {
            $intersection = array_intersect($localWords, $trendyolWords);
            $union = array_unique(array_merge($localWords, $trendyolWords));
            $wordScore = (int) round((count($intersection) / count($union)) * 75);

            if ($wordScore > 0) {
                return $wordScore;
            }
        }

        similar_text($localName, $trendyolName, $percent);
        $similarScore = (int) round($percent * 0.7);

        return $similarScore;
    }

    public function batchSaveCategoryMappings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mappings' => ['required', 'array', 'min:1'],
            'mappings.*.local_category_id' => ['required', 'exists:categories,id'],
            'mappings.*.marketplace_category_id' => ['required', 'exists:marketplace_categories,id'],
        ]);

        $savedCount = 0;

        foreach ($validated['mappings'] as $mapping) {
            MarketplaceCategoryMapping::updateOrCreate(
                [
                    'marketplace' => 'trendyol',
                    'local_category_id' => $mapping['local_category_id'],
                ],
                [
                    'marketplace_category_id' => $mapping['marketplace_category_id'],
                ]
            );
            $savedCount++;
        }

        return response()->json([
            'message' => "{$savedCount} kategori eşleştirmesi kaydedildi.",
            'saved_count' => $savedCount,
        ]);
    }

    // ==========================================
    // OTOMATİK MARKA EŞLEŞTİRME
    // ==========================================

    public function autoMatchBrands(): JsonResponse
    {
        $alreadyMappedLocalIds = MarketplaceBrandMapping::where('marketplace', 'trendyol')
            ->whereNotNull('local_brand_id')
            ->pluck('local_brand_id')
            ->toArray();

        $localBrands = Brand::whereNotIn('id', $alreadyMappedLocalIds)->get();

        $results = [];

        foreach ($localBrands as $local) {
            $name = trim($local->name);
            if ($name === '') {
                continue;
            }

            $suggestions = [];

            // 1) Tam eşleşme (SQL — büyük/küçük harf duyarsız)
            $exactMatches = MarketplaceBrandMapping::where('marketplace', 'trendyol')
                ->whereRaw('LOWER(marketplace_brand_name) = ?', [mb_strtolower($name, 'UTF-8')])
                ->limit(3)
                ->get();

            foreach ($exactMatches as $match) {
                $suggestions[] = [
                    'trendyolBrand' => [
                        'id' => $match->id,
                        'marketplaceBrandId' => $match->marketplace_brand_id,
                        'name' => $match->marketplace_brand_name,
                    ],
                    'score' => 100,
                ];
            }

            // Tam eşleşme bulduysa devam et
            if (count($suggestions) > 0) {
                $results[] = [
                    'localBrand' => ['id' => $local->id, 'name' => $local->name],
                    'suggestions' => array_slice($suggestions, 0, 3),
                ];
                continue;
            }

            // 2) İçerme (LIKE) eşleşmesi — marka adı diğerini içeriyorsa
            $likeMatches = MarketplaceBrandMapping::where('marketplace', 'trendyol')
                ->where('marketplace_brand_name', '!=', '')
                ->where(function ($q) use ($name) {
                    $q->whereRaw('LOWER(marketplace_brand_name) LIKE ?', ['%' . mb_strtolower($name, 'UTF-8') . '%'])
                      ->orWhereRaw('? LIKE CONCAT(\'%\', LOWER(marketplace_brand_name), \'%\')', [mb_strtolower($name, 'UTF-8')]);
                })
                ->limit(10)
                ->get();

            foreach ($likeMatches as $match) {
                $normalizedLocal = $this->turkishLower($name);
                $normalizedTrendyol = $this->turkishLower($match->marketplace_brand_name);

                // Tam eşleşme zaten yukarıda kontrol edildi
                $score = 85;

                // Daha hassas skor: kısa olan uzun olanı içeriyorsa
                if (mb_strlen($normalizedLocal) !== mb_strlen($normalizedTrendyol)) {
                    $shorter = mb_strlen($normalizedLocal) < mb_strlen($normalizedTrendyol) ? $normalizedLocal : $normalizedTrendyol;
                    $longer = mb_strlen($normalizedLocal) >= mb_strlen($normalizedTrendyol) ? $normalizedLocal : $normalizedTrendyol;
                    $ratio = mb_strlen($shorter) / max(1, mb_strlen($longer));
                    $score = (int) round(50 + ($ratio * 35)); // 50-85 arası
                }

                $suggestions[] = [
                    'trendyolBrand' => [
                        'id' => $match->id,
                        'marketplaceBrandId' => $match->marketplace_brand_id,
                        'name' => $match->marketplace_brand_name,
                    ],
                    'score' => $score,
                ];
            }

            // 3) Kelime bazlı arama — ilk kelimeyle LIKE (eğer henüz sonuç yoksa)
            if (count($suggestions) === 0) {
                $words = preg_split('/[\s\-_\/&,]+/u', $name);
                $firstWord = $words[0] ?? '';

                if (mb_strlen($firstWord) >= 3) {
                    $wordMatches = MarketplaceBrandMapping::where('marketplace', 'trendyol')
                        ->where('marketplace_brand_name', '!=', '')
                        ->whereRaw('LOWER(marketplace_brand_name) LIKE ?', [mb_strtolower($firstWord, 'UTF-8') . '%'])
                        ->limit(5)
                        ->get();

                    foreach ($wordMatches as $match) {
                        $normalizedLocal = $this->turkishLower($name);
                        $normalizedTrendyol = $this->turkishLower($match->marketplace_brand_name);
                        $score = $this->matchScore($normalizedLocal, $normalizedTrendyol);

                        if ($score >= 30) {
                            $suggestions[] = [
                                'trendyolBrand' => [
                                    'id' => $match->id,
                                    'marketplaceBrandId' => $match->marketplace_brand_id,
                                    'name' => $match->marketplace_brand_name,
                                ],
                                'score' => $score,
                            ];
                        }
                    }
                }
            }

            // Sırala ve en iyi 3'ü al
            usort($suggestions, fn($a, $b) => $b['score'] <=> $a['score']);

            // Tekrar edenleri kaldır
            $seen = [];
            $suggestions = array_values(array_filter($suggestions, function ($s) use (&$seen) {
                $key = $s['trendyolBrand']['id'];
                if (isset($seen[$key])) return false;
                $seen[$key] = true;
                return true;
            }));

            $results[] = [
                'localBrand' => ['id' => $local->id, 'name' => $local->name],
                'suggestions' => array_slice($suggestions, 0, 3),
            ];
        }

        return response()->json(['data' => $results]);
    }

    public function batchSaveBrandMappings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mappings' => ['required', 'array', 'min:1'],
            'mappings.*.local_brand_id' => ['required', 'exists:brands,id'],
            'mappings.*.marketplace_brand_mapping_id' => ['required', 'exists:marketplace_brand_mappings,id'],
        ]);

        $savedCount = 0;

        foreach ($validated['mappings'] as $mapping) {
            MarketplaceBrandMapping::where('id', $mapping['marketplace_brand_mapping_id'])
                ->update(['local_brand_id' => $mapping['local_brand_id']]);
            $savedCount++;
        }

        return response()->json([
            'message' => "{$savedCount} marka eşleştirmesi kaydedildi.",
            'saved_count' => $savedCount,
        ]);
    }

    /**
     * Ürünün mevcut attribute'larını döner.
     * Eğer "Renk" veya "Web Color" yoksa ürün isminden otomatik tespit eder.
     */
    private function buildExistingAttributesWithColorDetect(Product $product): array
    {
        $existingAttributes = $product->attributes->map(fn ($a) => [
            'attribute_name' => $a->attribute_name,
            'attribute_value' => $a->attribute_value,
        ])->toArray();

        $attrNamesLower = array_map('mb_strtolower', array_column($existingAttributes, 'attribute_name'));

        // Varyant değerlerinden özellik türlerini ekle (Renk, Beden vb.)
        // Aynı tür için tüm benzersiz değerleri ekle (ör: Renk: TURUNCU, Renk: TURKUAZ)
        $activeVariants = $product->relationLoaded('variants')
            ? $product->variants->where('is_active', true)
            : $product->variants()->where('is_active', true)->with('variantValues.variantOption.variantType')->get();

        $seenVariantValues = []; // "renk:turuncu" gibi tekrar kontrolü
        foreach ($activeVariants as $variant) {
            $variantValues = $variant->relationLoaded('variantValues')
                ? $variant->variantValues
                : $variant->variantValues()->with('variantOption.variantType')->get();

            foreach ($variantValues as $vv) {
                $typeName = $vv->variantOption?->variantType?->name;
                $optionValue = $vv->variantOption?->value;
                if (! $typeName || ! $optionValue) {
                    continue;
                }

                $typeNameLower = mb_strtolower($typeName);
                // product_attributes'da zaten varsa atla
                if (in_array($typeNameLower, $attrNamesLower)) {
                    continue;
                }

                $key = $typeNameLower . ':' . mb_strtolower($optionValue);
                if (isset($seenVariantValues[$key])) {
                    continue;
                }
                $seenVariantValues[$key] = true;

                $existingAttributes[] = [
                    'attribute_name' => $typeName,
                    'attribute_value' => $optionValue,
                ];
            }
        }

        $hasRenk = in_array('renk', $attrNamesLower);
        $hasWebColor = in_array('web color', $attrNamesLower);

        if (! $hasRenk || ! $hasWebColor) {
            $detected = TrendyolProductFormatter::detectColorFromName($product->name);

            if ($detected) {
                if (! $hasRenk) {
                    $existingAttributes[] = [
                        'attribute_name' => 'Renk',
                        'attribute_value' => $detected['renk'],
                    ];
                }
                if (! $hasWebColor) {
                    $existingAttributes[] = [
                        'attribute_name' => 'Web Color',
                        'attribute_value' => $detected['webColor'],
                    ];
                }
            }
        }

        return $existingAttributes;
    }

    // ==========================================
    // TOPLU FİYAT GÜNCELLEME
    // ==========================================

    private function computeNewPrice(float $currentPrice, array $rule): float
    {
        if ($rule['adjustment_type'] === 'percentage') {
            $result = $currentPrice * (1 + $rule['adjustment_value'] / 100);
        } else {
            $result = $currentPrice + $rule['adjustment_value'];
        }

        return max(0, round($result, 2));
    }

    public function getSettings(): JsonResponse
    {
        return response()->json([
            'min_stock' => (int) Setting::get('trendyol.min_stock', 0),
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate(['min_stock' => 'required|integer|min:0']);
        Setting::set('trendyol.min_stock', $validated['min_stock']);

        return response()->json(['message' => 'Kaydedildi']);
    }

    public function resetStatuses(): JsonResponse
    {
        $deleted = MarketplaceProduct::where('marketplace', 'trendyol')->delete();

        return response()->json([
            'message' => "{$deleted} ürün durumu sıfırlandı.",
            'deleted' => $deleted,
        ]);
    }

    public function trendyolProducts(Request $request): JsonResponse
    {
        $service = $this->getService();

        $filters = array_filter([
            'page' => max(0, (int) $request->input('page', 0)),
            'size' => min(200, max(1, (int) $request->input('size', 50))),
            'barcode' => $request->input('barcode'),
            'stockCode' => $request->input('stockCode'),
            'approved' => $request->has('approved') ? $request->boolean('approved') : null,
            'onSale' => $request->has('onSale') ? $request->boolean('onSale') : null,
        ], fn ($v) => $v !== null);

        $result = $service->getProducts($filters);

        $products = collect($result['products'])->map(fn ($p) => [
            'title' => $p['title'] ?? '',
            'barcode' => $p['barcode'] ?? '',
            'quantity' => $p['quantity'] ?? 0,
            'salePrice' => $p['salePrice'] ?? 0,
            'listPrice' => $p['listPrice'] ?? 0,
            'images' => $p['images'] ?? [],
            'stockCode' => $p['stockCode'] ?? '',
            'approved' => $p['approved'] ?? false,
            'onSale' => $p['onSale'] ?? false,
            'categoryName' => $p['categoryName'] ?? '',
        ]);

        return response()->json([
            'data' => $products,
            'meta' => [
                'page' => $result['page'],
                'totalPages' => $result['totalPages'],
                'totalElements' => $result['totalElements'],
            ],
        ]);
    }

    public function bulkPricePreview(BulkPriceUpdateRequest $request): JsonResponse
    {
        $productIds = $request->validated('product_ids');
        $rules = $request->validated('rules');

        $products = Product::with([
            'variants' => fn ($q) => $q->where('is_active', true),
        ])->whereIn('id', $productIds)->get();

        $result = [];
        $affected = 0;
        $unchanged = 0;

        foreach ($products as $product) {
            $hasVariants = $product->variants->isNotEmpty();

            if ($hasVariants) {
                $variantResults = [];
                $anyChanged = false;

                foreach ($product->variants as $variant) {
                    $currentPrice = (float) $variant->price;
                    $newPrice = $currentPrice;
                    $matched = false;

                    foreach ($rules as $rule) {
                        if ($currentPrice >= $rule['min_price'] && $currentPrice <= $rule['max_price']) {
                            $newPrice = $this->computeNewPrice($currentPrice, $rule);
                            $matched = true;
                            break;
                        }
                    }

                    $changed = $matched && $newPrice !== $currentPrice;
                    if ($changed) {
                        $anyChanged = true;
                    }

                    $variantResults[] = [
                        'id' => $variant->id,
                        'values' => $variant->variantValues()
                            ->with('variantOption.variantType')
                            ->get()
                            ->map(fn ($vv) => $vv->variantOption?->variantType?->name . ': ' . $vv->variantOption?->value)
                            ->filter()
                            ->implode(', ') ?: '-',
                        'currentPrice' => $currentPrice,
                        'newPrice' => $newPrice,
                        'changed' => $changed,
                    ];
                }

                if ($anyChanged) {
                    $affected++;
                } else {
                    $unchanged++;
                }

                $result[] = [
                    'id' => $product->id,
                    'name' => $product->name,
                    'hasVariants' => true,
                    'currentPrice' => (float) $product->price,
                    'newPrice' => (float) $product->price,
                    'changed' => $anyChanged,
                    'variants' => $variantResults,
                ];
            } else {
                $currentPrice = (float) $product->price;
                $newPrice = $currentPrice;
                $matched = false;

                foreach ($rules as $rule) {
                    if ($currentPrice >= $rule['min_price'] && $currentPrice <= $rule['max_price']) {
                        $newPrice = $this->computeNewPrice($currentPrice, $rule);
                        $matched = true;
                        break;
                    }
                }

                $changed = $matched && $newPrice !== $currentPrice;

                if ($changed) {
                    $affected++;
                } else {
                    $unchanged++;
                }

                $result[] = [
                    'id' => $product->id,
                    'name' => $product->name,
                    'hasVariants' => false,
                    'currentPrice' => $currentPrice,
                    'newPrice' => $newPrice,
                    'changed' => $changed,
                    'variants' => [],
                ];
            }
        }

        return response()->json([
            'products' => $result,
            'summary' => [
                'total' => count($result),
                'affected' => $affected,
                'unchanged' => $unchanged,
            ],
        ]);
    }

    // ==========================================
    // IMPORT (TRENDYOL → LOCAL MATCH)
    // ==========================================

    public function importProducts(): JsonResponse
    {
        $credential = $this->getCredential();

        $service = new TrendyolProductImportService();
        $stats = $service->import($credential);

        return response()->json([
            'message' => 'Import tamamlandı.',
            'stats' => $stats,
        ]);
    }

    // ==========================================
    // STOCK SYNC
    // ==========================================

    public function syncStock(): JsonResponse
    {
        $credential = $this->getCredential();

        $service = app(TrendyolStockSyncService::class);
        $log = $service->sync($credential);

        return response()->json([
            'message' => "Stok sync tamamlandı: {$log->stock_changed} ürün güncellendi.",
            'log' => [
                'id' => $log->id,
                'total_products' => $log->total_products,
                'stock_changed' => $log->stock_changed,
                'api_calls' => $log->api_calls,
                'failed' => $log->failed,
                'batch_request_ids' => $log->batch_request_ids ?? [],
                'error_log' => $log->error_log ?? [],
                'duration_seconds' => $log->duration_seconds,
                'started_at' => $log->started_at,
                'completed_at' => $log->completed_at,
            ],
        ]);
    }

    public function stockSyncResults(): JsonResponse
    {
        $logs = MarketplaceStockSyncLog::where('marketplace', 'trendyol')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn ($log) => [
                'id' => $log->id,
                'total_products' => $log->total_products,
                'stock_changed' => $log->stock_changed,
                'api_calls' => $log->api_calls,
                'failed' => $log->failed,
                'batch_request_ids' => $log->batch_request_ids ?? [],
                'error_log' => $log->error_log ?? [],
                'duration_seconds' => $log->duration_seconds,
                'started_at' => $log->started_at,
                'completed_at' => $log->completed_at,
            ]);

        return response()->json(['data' => $logs]);
    }

    public function checkStockBatch(string $batchRequestId): JsonResponse
    {
        $service = $this->getService();

        try {
            $result = $service->getBatchStatus($batchRequestId);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Trendyol API hatası: ' . $e->getMessage()], 502);
        }

        $items = $result['items'] ?? [];
        $successCount = 0;
        $failCount = 0;
        $failedItems = [];

        foreach ($items as $item) {
            $status = $item['status'] ?? '';
            $barcode = $item['requestItem']['barcode'] ?? '-';

            if ($status === 'SUCCESS') {
                $successCount++;
            } else {
                $failCount++;
                $reasons = [];
                foreach ($item['failureReasons'] ?? [] as $reason) {
                    $reasons[] = is_string($reason) ? $reason : ($reason['message'] ?? json_encode($reason));
                }
                $failedItems[] = [
                    'barcode' => $barcode,
                    'reasons' => implode('; ', $reasons) ?: 'Bilinmeyen hata',
                ];
            }
        }

        return response()->json([
            'message' => "Kontrol tamamlandı: {$successCount} başarılı, {$failCount} başarısız.",
            'successCount' => $successCount,
            'failCount' => $failCount,
            'failedItems' => $failedItems,
            'trendyolStatus' => $result['status'] ?? null,
            'trendyolItemCount' => count($items),
        ]);
    }

}
