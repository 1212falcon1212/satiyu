<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkPriceUpdateRequest;
use App\Http\Requests\SendMarketplaceProductsRequest;
use App\Http\Requests\UpdatePriceStockRequest;
use App\Http\Resources\MarketplaceCategoryResource;
use App\Http\Resources\MarketplaceProductResource;
use App\Jobs\Marketplace\SendHepsiburadaProductsJob;
use App\Jobs\Marketplace\SyncHepsiburadaCategoriesJob;
use App\Models\Category;
use App\Models\MarketplaceCategory;
use App\Models\MarketplaceCategoryMapping;
use App\Models\MarketplaceCredential;
use App\Models\MarketplaceProduct;
use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\Setting;
use App\Models\MarketplaceStockSyncLog;
use App\Services\Marketplace\HepsiburadaApiService;
use App\Services\Marketplace\HepsiburadaProductFormatter;
use App\Services\Marketplace\HepsiburadaStockSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class HepsiburadaController extends Controller
{
    protected function getService(): HepsiburadaApiService
    {
        $credential = MarketplaceCredential::where('marketplace', 'hepsiburada')
            ->where('is_active', true)
            ->firstOrFail();

        return new HepsiburadaApiService($credential);
    }

    protected function getCredential(): MarketplaceCredential
    {
        return MarketplaceCredential::where('marketplace', 'hepsiburada')
            ->where('is_active', true)
            ->firstOrFail();
    }

    // ==========================================
    // KATEGORI
    // ==========================================

    public function syncCategories(): JsonResponse
    {
        $credential = $this->getCredential();

        SyncHepsiburadaCategoriesJob::dispatch($credential->id);

        return response()->json([
            'message' => 'Kategori senk işlemi başladı.',
        ], Response::HTTP_ACCEPTED);
    }

    public function categories(Request $request): JsonResponse
    {
        $query = MarketplaceCategory::where('marketplace', 'hepsiburada');

        if ($request->has('search')) {
            $query->where('category_name', 'like', '%' . $request->input('search') . '%');
        }

        $categories = $query->paginate($request->input('per_page', 50));

        return MarketplaceCategoryResource::collection($categories)->response();
    }

    public function categoryAttributes(int $categoryId): JsonResponse
    {
        $service = $this->getService();
        $attributes = $service->getCategoryAttributes($categoryId);

        return response()->json(['data' => $attributes]);
    }

    public function attributeValues(int $categoryId, string $attributeId): JsonResponse
    {
        $service = $this->getService();
        $values = $service->getAttributeValues($categoryId, $attributeId);

        return response()->json(['data' => $values]);
    }

    public function categoryMappings(): JsonResponse
    {
        $mappings = MarketplaceCategoryMapping::where('marketplace', 'hepsiburada')
            ->with(['category', 'marketplaceCategory'])
            ->get();

        return response()->json([
            'data' => $mappings->map(fn ($m) => [
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
                'marketplace' => 'hepsiburada',
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
    // AYARLAR
    // ==========================================

    public function getSettings(): JsonResponse
    {
        return response()->json([
            'min_stock' => (int) Setting::get('hepsiburada.min_stock', 0),
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate(['min_stock' => 'required|integer|min:0']);
        Setting::set('hepsiburada.min_stock', $validated['min_stock']);

        return response()->json(['message' => 'Kaydedildi']);
    }

    // ==========================================
    // ÜRÜN — LISTELEME
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
                    ->orWhereHas('variants', fn ($vq) => $vq->where('is_active', true)->where('stock_quantity', '>', 0));
            });
        } elseif ($stockStatus === 'out_of_stock') {
            $query->where('stock_quantity', '<=', 0)
                ->whereDoesntHave('variants', fn ($vq) => $vq->where('is_active', true)->where('stock_quantity', '>', 0));
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
            $query->whereDoesntHave('marketplaceProducts', fn ($q) => $q->where('marketplace', 'hepsiburada'));
        } elseif ($mpStatus && $mpStatus !== 'all') {
            $query->whereHas('marketplaceProducts', fn ($q) => $q->where('marketplace', 'hepsiburada')->where('status', $mpStatus));
        }

        // Hazırlık filtresi — HB: barcode + images + category mapping (brand mapping YOK)
        $readiness = $request->input('readiness');
        if ($readiness === 'ready') {
            $query->where('barcode', '!=', '')
                ->whereNotNull('barcode')
                ->whereHas('images')
                ->whereHas('category', function ($q) {
                    $q->whereIn('categories.id', function ($sub) {
                        $sub->select('local_category_id')
                            ->from('marketplace_category_mappings')
                            ->where('marketplace', 'hepsiburada');
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
                                ->where('marketplace', 'hepsiburada');
                        });
                    });
            });
        }

        $products = $query->orderBy('name')
            ->paginate($request->input('per_page', 20));

        $productIds = $products->pluck('id');
        $mpProducts = MarketplaceProduct::where('marketplace', 'hepsiburada')
            ->whereIn('product_id', $productIds)
            ->get()
            ->keyBy('product_id');

        $categoryIds = $products->pluck('category_id')->unique();
        $categoryMappings = MarketplaceCategoryMapping::where('marketplace', 'hepsiburada')
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
                'hasBarcode' => ! empty($product->barcode),
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

    /**
     * Filtrelere göre tüm ürün ID'lerini döndürür (select all pages).
     */
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
            $catId = (int) $request->input('category_id');
            $categoryIds = collect([$catId]);
            $parentIds = collect([$catId]);
            while ($parentIds->isNotEmpty()) {
                $childIds = \App\Models\Category::whereIn('parent_id', $parentIds)->pluck('id');
                $categoryIds = $categoryIds->merge($childIds);
                $parentIds = $childIds;
            }
            $query->whereIn('category_id', $categoryIds->unique());
        }

        $stockStatus = $request->input('stock_status');
        if ($stockStatus === 'in_stock') {
            $query->where(function ($q) {
                $q->where('stock_quantity', '>', 0)
                    ->orWhereHas('variants', fn ($vq) => $vq->where('is_active', true)->where('stock_quantity', '>', 0));
            });
        } elseif ($stockStatus === 'out_of_stock') {
            $query->where('stock_quantity', '<=', 0)
                ->whereDoesntHave('variants', fn ($vq) => $vq->where('is_active', true)->where('stock_quantity', '>', 0));
        }

        $hasVariants = $request->input('has_variants');
        if ($hasVariants === 'yes') {
            $query->whereHas('variants', fn ($q) => $q->where('is_active', true));
        } elseif ($hasVariants === 'no') {
            $query->whereDoesntHave('variants', fn ($q) => $q->where('is_active', true));
        }

        $mpStatus = $request->input('mp_status');
        if ($mpStatus === 'not_sent') {
            $query->whereDoesntHave('marketplaceProducts', fn ($q) => $q->where('marketplace', 'hepsiburada'));
        } elseif ($mpStatus && $mpStatus !== 'all') {
            $query->whereHas('marketplaceProducts', fn ($q) => $q->where('marketplace', 'hepsiburada')->where('status', $mpStatus));
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
                            ->where('marketplace', 'hepsiburada');
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
                                ->where('marketplace', 'hepsiburada');
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
        $query = MarketplaceProduct::where('marketplace', 'hepsiburada')
            ->with('product');

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('marketplace_barcode', 'like', "%{$search}%")
                    ->orWhereHas('product', fn ($q2) => $q2->where('name', 'like', "%{$search}%"));
            });
        }

        $products = $query->orderByDesc('updated_at')
            ->paginate($request->input('per_page', 20));

        return MarketplaceProductResource::collection($products)->response();
    }

    // ==========================================
    // ÜRÜN — HAZIRLAMA & GÖNDERİM
    // ==========================================

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

            $mapping = MarketplaceCategoryMapping::where('marketplace', 'hepsiburada')
                ->where('local_category_id', $categoryId)
                ->with('marketplaceCategory')
                ->first();

            // Kategori özelliklerini al
            $rawAttributes = [];
            $marketplaceCategoryId = null;
            $marketplaceCategoryName = null;

            if ($mapping?->marketplaceCategory) {
                $marketplaceCategoryId = $mapping->marketplaceCategory->marketplace_category_id;
                $marketplaceCategoryName = $mapping->marketplaceCategory->category_name;

                $storedAttributes = $mapping->marketplaceCategory->attributes;
                if (! empty($storedAttributes)) {
                    $rawAttributes = $storedAttributes;
                } else {
                    try {
                        $rawAttributes = $this->getService()->getCategoryAttributes($marketplaceCategoryId);
                    } catch (\Exception) {
                        // Özellik alınamazsa devam et
                    }
                }
            }

            // HB attributes normalize: baseAttributes + attributes + variantAttributes → tek array
            $categoryAttributes = $this->normalizeCategoryAttributes($rawAttributes);

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

            // HB özellik adı → bizim varyant tipi alias eşleştirmesi
            // Örn: HB "Ayakkabı Numarası" → bizim "beden" variant tipimiz
            $variantAliasMap = $this->getVariantAliasMap();

            // Ürün bilgilerinden otomatik doldurulan attribute ID'leri
            // Bu alanlar formatter tarafından ürün verisinden set edilir, wizard'da gösterilmez
            $autoFilledIds = [
                'merchantsku', 'barcode', 'urunadi', 'urunaciklamasi',
                'marka', 'garantisuresi', 'kg', 'tax_vat_rate',
                'price', 'stock', 'varyantgroupid',
                'image1', 'image2', 'image3', 'image4', 'image5',
                'video1',
            ];
            $autoFilledNames = [
                'satıcı stok kodu', 'barkod', 'ürün adı', 'ürün açıklaması',
                'marka', 'garanti süresi', 'ağırlık', 'kdv', 'vergi oranı',
                'fiyat', 'stok', 'varyant grup id',
                'görsel1', 'görsel2', 'görsel3', 'görsel4', 'görsel5',
                'video1',
            ];

            // Attribute'ları işle — autoMatch kontrolü, required belirle
            $processedAttributes = [];
            foreach ($categoryAttributes as $attr) {
                $attrName = $attr['name'] ?? '';
                $attrId = $attr['id'] ?? $attr['attributeId'] ?? '';
                $attrNameLower = $this->turkishLower($attrName);
                $attrIdLower = strtolower($attrId);
                $group = $attr['_group'] ?? 'attributes';
                $isMandatory = $attr['mandatory'] ?? false;

                $processed = $attr;
                $processed['autoMatched'] = false;
                $processed['autoMatchSource'] = null;
                $processed['required'] = $isMandatory;

                // Type normalize: HB API type → frontend type (enum|text|numeric)
                $rawType = $processed['type'] ?? 'text';
                $processed['type'] = match ($rawType) {
                    'enum' => 'enum',
                    'integer' => 'numeric',
                    default => 'text', // string, media, video, etc.
                };

                // Values normalize: [{value: "X"}] → [{id: "X", name: "X"}]
                if (! empty($processed['values']) && is_array($processed['values'])) {
                    $processed['values'] = array_map(function ($v) {
                        if (isset($v['id']) && isset($v['name'])) {
                            return $v; // zaten doğru format
                        }

                        $val = $v['value'] ?? $v['name'] ?? '';

                        return ['id' => (string) $val, 'name' => (string) $val];
                    }, $processed['values']);
                }

                // baseAttributes grubundaki tüm alanlar ürün verisinden otomatik dolduruluyor
                if ($group === 'baseAttributes') {
                    $processed['autoMatched'] = true;
                    $processed['autoMatchSource'] = 'product_data';
                }
                // Bilinen auto-filled attribute ID veya adları
                elseif (in_array($attrIdLower, $autoFilledIds) || in_array($attrNameLower, $autoFilledNames)) {
                    $processed['autoMatched'] = true;
                    $processed['autoMatchSource'] = 'product_data';
                }
                // variantAttributes grubundaki attribute'lar varyant ile eşleşme kontrolü
                elseif ($group === 'variantAttributes') {
                    // Direkt isim eşleşmesi
                    if (isset($allVariantTypeNames[$attrNameLower])) {
                        $processed['autoMatched'] = true;
                        $processed['autoMatchSource'] = 'variant';
                    }
                    // Alias eşleştirmesi (örn: "ayakkabı numarası" → "beden")
                    else {
                        $aliases = $variantAliasMap[$attrNameLower] ?? [];
                        foreach ($aliases as $alias) {
                            if (isset($allVariantTypeNames[$alias])) {
                                $processed['autoMatched'] = true;
                                $processed['autoMatchSource'] = 'variant';
                                break;
                            }
                        }
                    }
                    // Renk özel durumu: ürün varyantında "renk" tipi olmasa bile
                    // ürün adından renk tespiti yapılıp existingAttributes'e ekleniyor.
                    // autoMatched işaretle, frontend per-product kontrol yapacak.
                    if (! $processed['autoMatched'] && $attrNameLower === 'renk') {
                        $processed['autoMatched'] = true;
                        $processed['autoMatchSource'] = 'variant';
                    }
                }

                $processedAttributes[] = $processed;
            }

            // Bizim varyant tipi → HB attribute adı reverse map
            // Örn: "beden" → "Ayakkabı Numarası" (eğer autoMatched ise)
            $variantTypeToHBName = [];
            foreach ($processedAttributes as $pAttr) {
                if (($pAttr['_group'] ?? '') === 'variantAttributes' && ($pAttr['autoMatched'] ?? false) && ($pAttr['autoMatchSource'] ?? '') === 'variant') {
                    $hbName = $pAttr['name'] ?? '';
                    $hbNameLower = $this->turkishLower($hbName);
                    // Direkt isim eşleşmesi
                    if (isset($allVariantTypeNames[$hbNameLower])) {
                        $variantTypeToHBName[$hbNameLower] = $hbName;
                    } else {
                        // Alias eşleşmesi — hangi internal variant type bunu tetikledi?
                        $aliases = $variantAliasMap[$hbNameLower] ?? [];
                        foreach ($aliases as $alias) {
                            if (isset($allVariantTypeNames[$alias])) {
                                $variantTypeToHBName[$alias] = $hbName;
                                break;
                            }
                        }
                    }
                }
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

                // Mevcut attribute'ları topla (product_attributes + varyant değerleri + isim tespiti)
                $existingAttributes = $product->attributes->map(fn ($a) => [
                    'attribute_name' => $a->attribute_name,
                    'attribute_value' => $a->attribute_value,
                ])->toArray();

                $attrNamesLower = array_map(fn ($a) => $this->turkishLower($a['attribute_name']), $existingAttributes);

                // Varyant değerlerini existingAttributes'a ekle
                // HB attribute adıyla ekle ki frontend'de eşleşme doğru çalışsın
                $seenVariantValues = [];
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
                        $typeNameLower = $this->turkishLower($typeName);

                        // HB attribute adı varsa onu kullan (alias eşleşmesi: "beden" → "Ayakkabı Numarası")
                        $displayName = $variantTypeToHBName[$typeNameLower] ?? $typeName;
                        $displayNameLower = $this->turkishLower($displayName);

                        if (in_array($displayNameLower, $attrNamesLower)) {
                            continue;
                        }
                        $key = $displayNameLower . ':' . $this->turkishLower($optionValue);
                        if (isset($seenVariantValues[$key])) {
                            continue;
                        }
                        $seenVariantValues[$key] = true;
                        $existingAttributes[] = [
                            'attribute_name' => $displayName,
                            'attribute_value' => $optionValue,
                        ];
                    }
                }

                // İsimden renk tespiti
                $colorKeywords = [
                    // Bileşik renkler önce (daha spesifik olanlar önce kontrol edilsin)
                    'koyu kahve', 'açık kahve', 'koyu yeşil', 'açık yeşil', 'koyu mavi', 'açık mavi',
                    'koyu gri', 'açık gri', 'koyu pembe', 'açık pembe',
                    // Tekil renkler
                    'siyah', 'beyaz', 'kırmızı', 'mavi', 'yeşil', 'sarı', 'turuncu', 'mor',
                    'pembe', 'gri', 'kahverengi', 'kahve', 'lacivert', 'bordo', 'turkuaz', 'bej',
                    'haki', 'füme', 'antrasit', 'ekru', 'lila', 'mercan', 'ten', 'vizon',
                    'indigo', 'taş', 'mint', 'hardal', 'petrol', 'kiremit', 'pudra', 'krem',
                    'zeytin', 'deve tüyü', 'camel', 'taba', 'bakır', 'gümüş', 'altın',
                    'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple',
                    'pink', 'gray', 'grey', 'brown', 'navy', 'khaki', 'beige', 'olive',
                ];
                $hasColorAttr = false;
                foreach ($existingAttributes as $ea) {
                    $eaLower = $this->turkishLower($ea['attribute_name']);
                    if (in_array($eaLower, ['renk', 'color', 'web color', 'web renk'])) {
                        $hasColorAttr = true;
                        break;
                    }
                }
                if (! $hasColorAttr) {
                    $nameLower = $this->turkishLower($product->name);
                    foreach ($colorKeywords as $color) {
                        if (mb_strpos($nameLower, $color) !== false) {
                            $existingAttributes[] = [
                                'attribute_name' => 'Renk',
                                'attribute_value' => mb_convert_case($color, MB_CASE_TITLE, 'UTF-8'),
                            ];
                            break;
                        }
                    }
                }

                $productData[] = [
                    'id' => $product->id,
                    'name' => $product->name,
                    'barcode' => $product->barcode,
                    'mainImage' => $product->images->first()?->image_url,
                    'stockQuantity' => $totalStock,
                    'existingAttributes' => $existingAttributes,
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

    /**
     * Ürünleri batch olarak Hepsiburada'ya gönderir.
     */
    public function sendProducts(SendMarketplaceProductsRequest $request): JsonResponse
    {
        $credential = $this->getCredential();

        $productIds = collect($request->validated('product_ids'));

        // Kritik stok filtresi
        $minStock = (int) $request->input('min_stock', 0);
        if ($minStock > 0) {
            $products = Product::with([
                'variants' => fn ($q) => $q->where('is_active', true),
            ])
                ->whereIn('id', $productIds)
                ->get();

            $productIds = $products->filter(function ($p) use ($minStock) {
                $stock = $p->variants->where('is_active', true)->isNotEmpty()
                    ? $p->variants->where('is_active', true)->sum('stock_quantity')
                    : $p->stock_quantity;

                return $stock > $minStock;
            })->pluck('id');
        }

        if ($productIds->isEmpty()) {
            return response()->json([
                'message' => 'Gönderilecek ürün bulunamadı.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $priceOverrides = $request->input('price_overrides', []);

        // Ürünleri 100'lük chunk'lara böl ve her chunk için job oluştur
        $chunks = $productIds->chunk(100);

        $jobs = $chunks->map(fn ($chunk) => new SendHepsiburadaProductsJob(
            $credential->id,
            $chunk->values()->toArray(),
            $priceOverrides,
        ));

        $batch = Bus::batch($jobs->toArray())
            ->name('hepsiburada-send-' . now()->timestamp)
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

    /**
     * Laravel batch ilerleme bilgisi.
     */
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

    // ==========================================
    // ÜRÜN — BATCH SONUÇLARI
    // ==========================================

    /**
     * Son gönderim batch'lerini listeler.
     */
    public function batchResults(): JsonResponse
    {
        $batches = MarketplaceProduct::where('marketplace', 'hepsiburada')
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
                $batch->errors = MarketplaceProduct::where('marketplace', 'hepsiburada')
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

            $batch->products = MarketplaceProduct::where('marketplace', 'hepsiburada')
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
     * HB API'den batch durumunu sorgular ve local kayıtları günceller.
     *
     * HB getProductStatus yanıt formatı:
     * {
     *   "success": true,
     *   "totalElements": 15,
     *   "data": [
     *     {
     *       "merchantSku": "ABC123",
     *       "importStatus": "FAILED" | "SUCCESS" | "WAITING" | "PROCESSING",
     *       "importMessages": [{"severity": "ERROR", "message": "..."}],
     *       "rejectReasonsMessages": "..." | null,
     *       "productStatus": "..." | null,
     *       "hbSku": "..." | null,
     *       ...
     *     }
     *   ]
     * }
     */
    public function checkBatchFromHB(string $trackingId): JsonResponse
    {
        $service = $this->getService();

        try {
            $result = $service->getProductStatus($trackingId);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Hepsiburada API hatası: ' . $e->getMessage(),
            ], Response::HTTP_BAD_GATEWAY);
        }

        // HB yanıt parse
        $items = $result['data'] ?? [];
        $totalElements = $result['totalElements'] ?? count($items);

        // Genel durum: tüm item'lar henüz işlenmemişse PROCESSING
        $overallStatus = 'COMPLETED';
        $processingCount = 0;
        foreach ($items as $item) {
            $importStatus = strtoupper($item['importStatus'] ?? '');
            if (in_array($importStatus, ['WAITING', 'PROCESSING', ''])) {
                $processingCount++;
            }
        }
        if ($processingCount > 0 && $processingCount === count($items)) {
            $overallStatus = 'PROCESSING';
        } elseif ($processingCount > 0) {
            $overallStatus = 'PARTIAL';
        }

        $successCount = 0;
        $failCount = 0;
        $failedItems = [];

        // merchantSku → HB item map
        $itemsBySku = [];
        foreach ($items as $item) {
            $sku = strtoupper($item['merchantSku'] ?? '');
            if ($sku) {
                $itemsBySku[$sku] = $item;
            }
        }

        // Get all marketplace_products for this batch
        $mpProducts = MarketplaceProduct::where('marketplace', 'hepsiburada')
            ->where('batch_request_id', $trackingId)
            ->with('product:id,barcode,sku,name')
            ->get();

        foreach ($mpProducts as $mpProduct) {
            $product = $mpProduct->product;
            if (! $product) {
                continue;
            }

            // Ürünün variant'larını listing_data'dan al
            $listingData = $mpProduct->listing_data ?? [];
            $variantSkus = [];

            if (! empty($listingData['variants'])) {
                foreach ($listingData['variants'] as $variantData) {
                    $vSku = $variantData['sku'] ?? $variantData['barcode'] ?? '';
                    if ($vSku) {
                        $variantSkus[] = strtoupper(preg_replace('/[^A-Za-z0-9_-]/', '', $vSku));
                    }
                }
            }

            // Varyant yoksa product-level SKU dene
            if (empty($variantSkus)) {
                $variantSkus[] = strtoupper(preg_replace('/[^A-Za-z0-9_-]/', '', $product->sku ?? $product->barcode ?? ''));
            }

            // Variant SKU'larıyla HB item'larını eşleştir
            $matchedItems = [];
            foreach ($variantSkus as $vSku) {
                if (isset($itemsBySku[$vSku])) {
                    $matchedItems[] = $itemsBySku[$vSku];
                }
            }

            if (empty($matchedItems)) {
                continue;
            }

            // Variant sonuçlarını analiz et
            $variantSuccess = 0;
            $variantFail = 0;
            $variantProcessing = 0;
            $errorMessages = [];

            foreach ($matchedItems as $matchedItem) {
                $importStatus = strtoupper($matchedItem['importStatus'] ?? '');

                if (in_array($importStatus, ['SUCCESS', 'COMPLETED'])) {
                    $variantSuccess++;
                } elseif ($importStatus === 'FAILED') {
                    $variantFail++;
                    // importMessages array → mesajları topla
                    $msgs = $matchedItem['importMessages'] ?? [];
                    foreach ($msgs as $msg) {
                        $text = is_string($msg) ? $msg : ($msg['message'] ?? json_encode($msg));
                        if ($text && ! in_array($text, $errorMessages)) {
                            $errorMessages[] = $text;
                        }
                    }
                    // rejectReasonsMessages fallback
                    if (empty($msgs) && ! empty($matchedItem['rejectReasonsMessages'])) {
                        $errorMessages[] = $matchedItem['rejectReasonsMessages'];
                    }
                } else {
                    $variantProcessing++;
                }
            }

            // Ürün-level durum belirle
            if ($variantProcessing > 0) {
                // Hâlâ işleniyor, güncelleme yapma
                continue;
            }

            if ($variantFail > 0 && $variantSuccess === 0) {
                // Tüm varyantlar fail
                $errorMsg = implode('; ', $errorMessages) ?: 'Bilinmeyen hata';
                $mpProduct->update(['status' => 'rejected', 'error_message' => mb_substr($errorMsg, 0, 500)]);
                $failCount++;
                $failedItems[] = [
                    'productName' => $product->name,
                    'barcode' => $product->barcode,
                    'reasons' => $errorMsg,
                    'failedVariants' => $variantFail,
                    'totalVariants' => count($matchedItems),
                ];
            } elseif ($variantSuccess > 0 && $variantFail === 0) {
                // Tüm varyantlar başarılı
                $mpProduct->update(['status' => 'approved', 'error_message' => null]);
                $successCount++;
            } else {
                // Kısmi: bazı varyantlar fail, bazıları success
                $errorMsg = implode('; ', $errorMessages) ?: 'Kısmi hata';
                $mpProduct->update([
                    'status' => 'approved',
                    'error_message' => "Kısmi: {$variantSuccess}/{$variantFail} başarılı/başarısız. " . $errorMsg,
                ]);
                $successCount++;
                if (! empty($errorMessages)) {
                    $failedItems[] = [
                        'productName' => $product->name,
                        'barcode' => $product->barcode,
                        'reasons' => "Kısmi hata: {$variantFail} varyant başarısız — " . implode('; ', $errorMessages),
                        'failedVariants' => $variantFail,
                        'totalVariants' => count($matchedItems),
                    ];
                }
            }
        }

        return response()->json([
            'message' => "HB kontrolü tamamlandı: {$successCount} ürün başarılı, {$failCount} ürün başarısız.",
            'successCount' => $successCount,
            'failCount' => $failCount,
            'failedItems' => $failedItems,
            'hbStatus' => $overallStatus,
            'hbItemCount' => $totalElements,
        ]);
    }

    // ==========================================
    // ÜRÜN — FİYAT/STOK
    // ==========================================

    public function updatePriceStock(UpdatePriceStockRequest $request): JsonResponse
    {
        $service = $this->getService();
        $formatter = new HepsiburadaProductFormatter();

        $items = [];
        foreach ($request->validated('items') as $item) {
            $product = Product::find($item['product_id']);
            if (! $product) {
                continue;
            }

            $mpProduct = MarketplaceProduct::where('marketplace', 'hepsiburada')
                ->where('product_id', $product->id)
                ->first();

            if (! $mpProduct) {
                continue;
            }

            if (isset($item['price'])) {
                $product->price = $item['price'];
            }
            if (isset($item['stock'])) {
                $product->stock_quantity = $item['stock'];
            }

            $items[] = $formatter->formatForPriceStock($product, $mpProduct);
        }

        if (empty($items)) {
            return response()->json([
                'message' => 'Güncellenecek ürün bulunamadı.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $result = $service->updatePriceAndStock($items);

        return response()->json([
            'message' => count($items) . ' ürünün fiyat/stok bilgisi güncellendi.',
            'data' => $result,
        ]);
    }

    public function productStatus(string $trackingId): JsonResponse
    {
        $service = $this->getService();
        $result = $service->getProductStatus($trackingId);

        return response()->json(['data' => $result]);
    }

    public function listings(Request $request): JsonResponse
    {
        $service = $this->getService();
        $result = $service->getListings(
            $request->input('offset', 0),
            $request->input('limit', 100)
        );

        return response()->json(['data' => $result]);
    }

    // ==========================================
    // YARDIMCILAR
    // ==========================================

    /**
     * HB attributes normalize: baseAttributes + attributes + variantAttributes → tek array with _group tag.
     */
    protected function normalizeCategoryAttributes(array $rawAttrs): array
    {
        $normalized = [];

        foreach (['baseAttributes', 'attributes', 'variantAttributes'] as $group) {
            $groupAttrs = $rawAttrs[$group] ?? [];
            if (! is_array($groupAttrs)) {
                continue;
            }
            foreach ($groupAttrs as $attr) {
                $attr['_group'] = $group;
                $normalized[] = $attr;
            }
        }

        // If the raw data is already a flat array (not grouped), return as-is
        if (empty($normalized) && ! empty($rawAttrs) && isset($rawAttrs[0])) {
            return $rawAttrs;
        }

        return $normalized;
    }

    // ─── Category Matching (Trendyol-style) ────────────────────

    /**
     * @return \Illuminate\Support\Collection<int, MarketplaceCategory> keyed by marketplace_category_id
     */
    protected function getHepsiburadaCategoryLookup(): \Illuminate\Support\Collection
    {
        return MarketplaceCategory::where('marketplace', 'hepsiburada')
            ->select(['id', 'marketplace_category_id', 'category_name', 'parent_id'])
            ->get()
            ->keyBy('marketplace_category_id');
    }

    protected function buildCategoryPath(MarketplaceCategory $category, \Illuminate\Support\Collection $lookup): string
    {
        $parts = [$category->category_name];
        $current = $category;

        while ($current->parent_id !== null) {
            $parent = $lookup->get($current->parent_id);
            if (! $parent) {
                break;
            }
            array_unshift($parts, $parent->category_name);
            $current = $parent;
        }

        return implode(' > ', $parts);
    }

    protected function matchScore(string $localName, string $marketplaceName): int
    {
        if ($localName === $marketplaceName) {
            return 100;
        }

        if (mb_strpos($marketplaceName, $localName) !== false || mb_strpos($localName, $marketplaceName) !== false) {
            return 85;
        }

        $localWords = array_filter(preg_split('/[\s\-_\/&,]+/u', $localName));
        $marketplaceWords = array_filter(preg_split('/[\s\-_\/&,]+/u', $marketplaceName));

        if (! empty($localWords) && ! empty($marketplaceWords)) {
            $intersection = array_intersect($localWords, $marketplaceWords);
            $union = array_unique(array_merge($localWords, $marketplaceWords));
            $wordScore = (int) round((count($intersection) / count($union)) * 75);

            if ($wordScore > 0) {
                return $wordScore;
            }
        }

        similar_text($localName, $marketplaceName, $percent);

        return (int) round($percent * 0.7);
    }

    /**
     * Get cached leaf categories with pre-built paths and lowered paths for fast search.
     * Cache is invalidated when categories are synced (24h TTL as safety).
     */
    protected function getCachedHBLeafCategories(): array
    {
        return Cache::remember('hb_leaf_categories_with_paths', 60 * 60 * 24, function () {
            $allCategories = MarketplaceCategory::where('marketplace', 'hepsiburada')
                ->select(['id', 'marketplace_category_id', 'category_name', 'parent_id'])
                ->get();
            $lookup = $allCategories->keyBy('marketplace_category_id');
            $hasChildrenSet = $allCategories->pluck('parent_id')->filter()->unique()->flip();

            $leaves = [];
            foreach ($allCategories as $cat) {
                if ($hasChildrenSet->has($cat->marketplace_category_id)) {
                    continue; // not a leaf
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
        $leaves = $this->getCachedHBLeafCategories();

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

                if (isset($exactIdSet[$leaf['id']])) {
                    continue;
                }

                $pathLower = $leaf['pathLower'];
                $allWordsMatch = true;

                foreach ($words as $word) {
                    if (mb_strpos($pathLower, $word) !== false) {
                        continue;
                    }
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

        $results = array_slice(array_merge($exactResults, $fuzzyResults), 0, $limit);

        return response()->json(['data' => $results]);
    }

    public function autoMatchCategories(): JsonResponse
    {
        $localLeaves = Category::whereDoesntHave('children')->get();
        $hbLeaves = $this->getCachedHBLeafCategories();

        $existingMappings = MarketplaceCategoryMapping::where('marketplace', 'hepsiburada')
            ->pluck('local_category_id')
            ->toArray();

        $results = [];

        foreach ($localLeaves as $local) {
            if (in_array($local->id, $existingMappings)) {
                continue;
            }

            $suggestions = [];
            $normalizedLocal = $this->turkishLower(trim($local->name));

            foreach ($hbLeaves as $hb) {
                $score = $this->matchScore($normalizedLocal, $hb['nameLower']);

                if ($score >= 30) {
                    $suggestions[] = [
                        'trendyolCategory' => [
                            'id' => $hb['id'],
                            'categoryName' => $hb['categoryName'],
                            'marketplaceCategoryId' => $hb['marketplaceCategoryId'],
                            'path' => $hb['path'],
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

    public function categoryMappingsWithPath(): JsonResponse
    {
        $mappings = MarketplaceCategoryMapping::where('marketplace', 'hepsiburada')
            ->with(['category', 'marketplaceCategory'])
            ->get();

        $neededParentIds = $mappings
            ->filter(fn ($m) => $m->marketplaceCategory && $m->marketplaceCategory->parent_id)
            ->pluck('marketplaceCategory.parent_id')
            ->unique()
            ->values();

        $lookup = collect();
        $idsToFetch = $neededParentIds;

        while ($idsToFetch->isNotEmpty()) {
            $fetched = MarketplaceCategory::where('marketplace', 'hepsiburada')
                ->whereIn('marketplace_category_id', $idsToFetch)
                ->get()
                ->keyBy('marketplace_category_id');

            $lookup = $lookup->merge($fetched);

            $idsToFetch = $fetched
                ->pluck('parent_id')
                ->filter()
                ->reject(fn ($id) => $lookup->has($id))
                ->unique()
                ->values();
        }

        return response()->json([
            'data' => $mappings->map(fn ($m) => [
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
                    'marketplace' => 'hepsiburada',
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

    protected function turkishLower(string $str): string
    {
        $str = str_replace("\xC4\xB0", 'i', $str);
        $str = mb_strtolower($str, 'UTF-8');
        $str = str_replace("i\xCC\x87", 'i', $str);

        return $str;
    }

    /**
     * HB özellik adı → bizim varyant tipi adı eşleştirme haritası.
     * HB farklı kategorilerde farklı isimlerle beden/numara ister (Ayakkabı Numarası, Beden, EU Numara vs.)
     * Bu harita sayesinde bizim "beden" veya "renk" varyant tiplerimiz otomatik eşleşir.
     */
    protected function getVariantAliasMap(): array
    {
        return [
            // Numara/beden varyasyonları → bizim "beden" tipimiz
            'ayakkabı numarası' => ['beden', 'numara'],
            'eu numara' => ['beden', 'numara'],
            'bot numarası' => ['beden', 'numara'],
            'çizme numarası' => ['beden', 'numara'],
            'terlik numarası' => ['beden', 'numara'],
            'sandalet numarası' => ['beden', 'numara'],
            'numara' => ['beden', 'numara'],
            'giysi bedeni' => ['beden'],
            'beden' => ['beden'],
            // Renk
            'renk' => ['renk', 'color'],
        ];
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
    // STOCK SYNC
    // ==========================================

    public function syncStock(): JsonResponse
    {
        $credential = $this->getCredential();

        $service = app(HepsiburadaStockSyncService::class);
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
        $logs = MarketplaceStockSyncLog::where('marketplace', 'hepsiburada')
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
}
