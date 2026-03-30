<?php

namespace App\Services\Xml;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\ProductVariantImage;
use App\Models\ProductVariantType;
use App\Models\ProductVariantValue;
use App\Models\VariantOption;
use App\Models\VariantType;
use App\Models\XmlBrandMapping;
use App\Models\XmlCategoryMapping;
use App\Models\XmlImportLog;
use App\Models\XmlProduct;
use App\Models\XmlSource;
use App\Models\XmlUpdateLog;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class XmlImportService
{
    private ?array $categoryMappingsCache = null;
    private ?array $brandMappingsCache = null;

    public function __construct(
        private readonly XmlParserService $parser,
        private readonly XmlPricingService $pricingService,
        private readonly BarcodeGeneratorService $barcodeGenerator,
    ) {}

    public static function cacheKey(int $xmlSourceId): string
    {
        return "xml_import_progress:{$xmlSourceId}";
    }

    protected function updateProgress(string $cacheKey, array $data): void
    {
        $current = Cache::get($cacheKey, []);
        Cache::put($cacheKey, array_merge($current, $data, ['updated_at' => now()->toISOString()]), 3600);
    }

    public function preparePreview(XmlSource $source): array
    {
        $xmlContent = $this->fetchContent($source);
        $xml = $this->parser->parseXml($xmlContent);

        $mapper = new XmlFieldMapper($source->mapping_config ?? []);
        $rawProducts = $this->parser->extractProducts(
            $xml,
            $mapper->getProductNode(),
            $mapper->getWrapperNode(),
        );

        $total = count($rawProducts);
        $categories = [];
        $brands = [];
        $products = [];

        foreach ($rawProducts as $index => $rawProduct) {
            $mapped = $mapper->map($rawProduct);
            $mapped['_index'] = $index;
            $mapped['_images'] = $this->parser->extractImages($rawProduct);
            $mapped['_variants'] = $mapper->mapVariants($rawProduct);
            $mapped['_raw'] = $rawProduct;

            // Build category path from parts or fallback to category > subcategory
            if (!empty($mapped['_category_parts'])) {
                $mapped['_category_path'] = implode(' > ', $mapped['_category_parts']);
            } else {
                $mainCat = trim($mapped['category'] ?? '');
                $subCat = trim($mapped['subcategory'] ?? '');
                if ($mainCat && $subCat && $subCat !== $mainCat) {
                    $mapped['_category_path'] = $mainCat . ' > ' . $subCat;
                } else {
                    $mapped['_category_path'] = $mainCat ?: $subCat;
                }
            }

            $catPath = $mapped['_category_path'];
            if ($catPath && !in_array($catPath, $categories, true)) {
                $categories[] = $catPath;
            }

            $brand = $mapped['brand'] ?? null;
            if ($brand && !in_array($brand, $brands, true)) {
                $brands[] = $brand;
            }

            $products[] = $mapped;
        }

        sort($categories);
        sort($brands);

        $previewPath = "xml-preview/{$source->id}.json";
        Storage::put($previewPath, json_encode($products, JSON_UNESCAPED_UNICODE));

        return [
            'total' => $total,
            'categories' => $categories,
            'brands' => $brands,
            'prepared_at' => now()->toISOString(),
        ];
    }

    public function getPaginatedPreview(XmlSource $source, int $page = 1, int $perPage = 50, ?string $category = null, ?string $brand = null, array $excludedCategories = [], bool $applyPriceRules = false): array
    {
        $previewPath = "xml-preview/{$source->id}.json";

        if (!Storage::exists($previewPath)) {
            return ['products' => [], 'total' => 0, 'page' => $page, 'per_page' => $perPage, 'last_page' => 1];
        }

        $products = json_decode(Storage::get($previewPath), true);

        // Filter out excluded categories first
        if (!empty($excludedCategories)) {
            $excludedSet = array_flip($excludedCategories);
            $products = array_values(array_filter($products, fn ($p) => !isset($excludedSet[$p['_category_path'] ?? ''])));
        }

        // Collect available brands and categories AFTER exclusion but BEFORE specific filters
        $availableBrands = [];
        $availableCategories = [];
        foreach ($products as $p) {
            $b = $p['brand'] ?? null;
            if ($b && !in_array($b, $availableBrands, true)) $availableBrands[] = $b;
            $c = $p['_category_path'] ?? null;
            if ($c && !in_array($c, $availableCategories, true)) $availableCategories[] = $c;
        }
        sort($availableBrands);
        sort($availableCategories);
        $filteredTotal = count($products);

        if ($category) {
            $products = array_values(array_filter($products, fn ($p) => ($p['_category_path'] ?? '') === $category));
        }

        if ($brand) {
            $products = array_values(array_filter($products, fn ($p) => ($p['brand'] ?? '') === $brand));
        }

        $total = count($products);
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min($page, $lastPage);
        $offset = ($page - 1) * $perPage;

        $paginatedProducts = array_slice($products, $offset, $perPage);

        // Apply price rules to paginated products for preview
        if ($applyPriceRules) {
            $pricingService = app(XmlPricingService::class);
            $hasPriceRules = $source->priceRules()->where('is_active', true)->exists();
            if ($hasPriceRules) {
                foreach ($paginatedProducts as &$p) {
                    $price = $this->parser->parsePrice($p['price'] ?? 0);
                    $comparePrice = $this->parser->parsePrice($p['compare_price'] ?? 0);
                    $adjusted = $pricingService->applyRules(
                        $source,
                        $price,
                        $comparePrice > 0 ? $comparePrice : null,
                        $p['_category_path'] ?? null,
                        $p['brand'] ?? null,
                    );
                    $p['_adjusted_price'] = $adjusted['price'];
                    $p['_adjusted_compare_price'] = $adjusted['compare_price'];
                    $p['_original_price'] = $price;
                    $p['_original_compare_price'] = $comparePrice;
                }
                unset($p);
            }
        }

        return [
            'products' => $paginatedProducts,
            'total' => $total,
            'filtered_total' => $filteredTotal,
            'available_brands' => $availableBrands,
            'available_categories' => $availableCategories,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => $lastPage,
        ];
    }

    public function import(XmlSource $source, array $filters = []): XmlImportLog
    {
        $cacheKey = self::cacheKey($source->id);

        $log = XmlImportLog::create([
            'xml_source_id' => $source->id,
            'total_products' => 0,
            'created' => 0,
            'updated' => 0,
            'failed' => 0,
            'error_log' => [],
            'started_at' => now(),
            'completed_at' => null,
        ]);

        $stats = ['created' => 0, 'updated' => 0, 'failed' => 0];
        $errors = [];

        try {
            // Phase: downloading
            $this->updateProgress($cacheKey, [
                'status' => 'downloading',
                'log_id' => $log->id,
                'total' => 0,
                'processed' => 0,
                'created' => 0,
                'updated' => 0,
                'failed' => 0,
            ]);

            $xmlContent = $this->fetchContent($source);

            // Phase: parsing
            $this->updateProgress($cacheKey, ['status' => 'parsing']);

            $xml = $this->parser->parseXml($xmlContent);

            $mapper = new XmlFieldMapper($source->mapping_config ?? []);
            $rawProducts = $this->parser->extractProducts(
                $xml,
                $mapper->getProductNode(),
                $mapper->getWrapperNode(),
            );

            // Apply filters if provided
            if (!empty($filters)) {
                $rawProducts = $this->applyImportFilters($rawProducts, $mapper, $filters);
            }

            $total = count($rawProducts);

            // Phase: processing
            $this->updateProgress($cacheKey, [
                'status' => 'processing',
                'total' => $total,
            ]);

            $priceAdjustmentPercent = $filters['price_adjustment_percent'] ?? null;

            // Pre-load mappings for this source
            $this->loadMappingsCache($source);
            $hasPriceRules = $source->priceRules()->where('is_active', true)->exists();

            $processed = 0;
            $chunkIndex = 0;

            foreach (array_chunk($rawProducts, 100) as $chunk) {
                foreach ($chunk as $rawProduct) {
                    try {
                        $mapped = $mapper->map($rawProduct);
                        $variants = $mapper->mapVariants($rawProduct);

                        // Store original XML price before any rules are applied
                        $mapped['_original_xml_price'] = $mapped['price'] ?? null;

                        // Build category path for price rule matching
                        $mainCat = trim($mapped['category'] ?? '');
                        $subCat = trim($mapped['subcategory'] ?? '');
                        $categoryPath = ($mainCat && $subCat && $subCat !== $mainCat)
                            ? $mainCat . ' > ' . $subCat
                            : ($mainCat ?: $subCat);

                        // Apply legacy price adjustment if set
                        if ($priceAdjustmentPercent) {
                            $mapped = $this->applyPriceAdjustment($mapped, $priceAdjustmentPercent);
                            $variants = array_map(fn ($v) => $this->applyVariantPriceAdjustment($v, $priceAdjustmentPercent), $variants);
                        }

                        // Apply price rules (new system)
                        $zeroPriceWarning = false;
                        if ($hasPriceRules) {
                            $price = $this->parser->parsePrice($mapped['price'] ?? 0);
                            $comparePrice = $this->parser->parsePrice($mapped['compare_price'] ?? 0);
                            $adjusted = $this->pricingService->applyRules(
                                $source,
                                $price,
                                $comparePrice > 0 ? $comparePrice : null,
                                $categoryPath,
                                $mapped['brand'] ?? null,
                            );
                            $mapped['price'] = (string) $adjusted['price'];
                            $mapped['compare_price'] = $adjusted['compare_price'] !== null ? (string) $adjusted['compare_price'] : '';
                            $zeroPriceWarning = $adjusted['zero_price_warning'] ?? false;

                            // Apply to variants too
                            foreach ($variants as &$v) {
                                if (!empty($v['price'])) {
                                    $vPrice = $this->parser->parsePrice($v['price']);
                                    $vAdjusted = $this->pricingService->applyRules($source, $vPrice, null, $categoryPath, $mapped['brand'] ?? null);
                                    $v['price'] = (string) $vAdjusted['price'];
                                }
                            }
                            unset($v);
                        } else {
                            // Even without price rules, detect zero-price products
                            $rawPrice = $this->parser->parsePrice($mapped['price'] ?? 0);
                            if ($rawPrice < 0.02) {
                                $zeroPriceWarning = true;
                            }
                        }

                        // Flag zero-price products for deactivation during upsert
                        if ($zeroPriceWarning) {
                            $mapped['_zero_price_warning'] = true;
                        }

                        $this->upsertProduct($source, $mapped, $rawProduct, $variants, $stats, $processed);
                    } catch (\Throwable $e) {
                        $stats['failed']++;
                        $sku = $rawProduct['stockCode'] ?? $rawProduct['barcode'] ?? $rawProduct['barkod'] ?? 'bilinmeyen';
                        $errors[] = "SKU {$sku}: {$e->getMessage()}";
                        Log::warning('XML ürün import hatası', [
                            'source_id' => $source->id,
                            'sku' => $sku,
                            'error' => $e->getMessage(),
                        ]);
                    }
                    $processed++;
                }

                $chunkIndex++;

                // Update cache after each chunk
                $this->updateProgress($cacheKey, [
                    'processed' => $processed,
                    'created' => $stats['created'],
                    'updated' => $stats['updated'],
                    'failed' => $stats['failed'],
                ]);

                // Persist to DB every 5 chunks (500 products) as crash fallback
                if ($chunkIndex % 5 === 0) {
                    $log->update([
                        'total_products' => $total,
                        'created' => $stats['created'],
                        'updated' => $stats['updated'],
                        'failed' => $stats['failed'],
                        'error_log' => $errors,
                    ]);
                }
            }

            $log->update([
                'total_products' => $total,
                'created' => $stats['created'],
                'updated' => $stats['updated'],
                'failed' => $stats['failed'],
                'error_log' => $errors,
                'completed_at' => now(),
            ]);

            $source->update(['last_synced_at' => now()]);

            // Phase: completed
            $this->updateProgress($cacheKey, [
                'status' => 'completed',
                'processed' => $total,
                'created' => $stats['created'],
                'updated' => $stats['updated'],
                'failed' => $stats['failed'],
            ]);
        } catch (\Throwable $e) {
            $log->update([
                'failed' => $stats['failed'] + 1,
                'error_log' => array_merge($errors, ["Genel hata: {$e->getMessage()}"]),
                'completed_at' => now(),
            ]);

            $this->updateProgress($cacheKey, [
                'status' => 'failed',
                'error' => $e->getMessage(),
                'created' => $stats['created'],
                'updated' => $stats['updated'],
                'failed' => $stats['failed'] + 1,
            ]);

            Log::error('XML import genel hatası', [
                'source_id' => $source->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }

        return $log->fresh();
    }

    public function preview(XmlSource $source, int $limit = 10): array
    {
        $xmlContent = $this->fetchContent($source);
        $xml = $this->parser->parseXml($xmlContent);

        $mapper = new XmlFieldMapper($source->mapping_config ?? []);
        $rawProducts = $this->parser->extractProducts(
            $xml,
            $mapper->getProductNode(),
            $mapper->getWrapperNode(),
            $limit,
        );

        $total = count($rawProducts);
        $sample = [];

        foreach ($rawProducts as $rawProduct) {
            $mapped = $mapper->map($rawProduct);
            $mapped['_images'] = $this->parser->extractImages($rawProduct);
            $mapped['_variants'] = $mapper->mapVariants($rawProduct);
            $mapped['_raw'] = $rawProduct;
            $sample[] = $mapped;
        }

        return [
            'total' => $total,
            'sample' => $sample,
            'fields' => $this->parser->detectFields($rawProducts),
        ];
    }

    public function detectAvailableFields(XmlSource $source): array
    {
        $xmlContent = $this->fetchContent($source);
        $mapper = new XmlFieldMapper($source->mapping_config ?? []);

        // Use XMLReader streaming — only parses first 20 product nodes, no full DOM load
        return $this->parser->detectFieldsStreaming(
            $xmlContent,
            20,
            $mapper->getProductNode(),
            $mapper->getWrapperNode(),
        );
    }

    /**
     * Detect fields AND return sample values + variant info from first 3 products.
     */
    public function detectAvailableFieldsWithSamples(XmlSource $source): array
    {
        $xmlContent = $this->fetchContent($source);
        $mapper = new XmlFieldMapper($source->mapping_config ?? []);

        $fields = $this->parser->detectFieldsStreaming(
            $xmlContent,
            20,
            $mapper->getProductNode(),
            $mapper->getWrapperNode(),
        );

        // Get 3 sample products for preview values
        $xml = $this->parser->parseXml($xmlContent);
        $rawProducts = $this->parser->extractProducts(
            $xml,
            $mapper->getProductNode(),
            $mapper->getWrapperNode(),
            3,
        );

        // Build sample values: { fieldName: "example value from first product" }
        $samples = [];
        foreach ($rawProducts as $product) {
            foreach ($product as $key => $value) {
                if (!isset($samples[$key]) && !is_array($value) && trim((string) $value) !== '') {
                    $val = (string) $value;
                    $samples[$key] = mb_strlen($val) > 80 ? mb_substr($val, 0, 80) . '...' : $val;
                }
            }
        }

        // Detect variant structure — show first 3 variants from first product
        $hasVariants = false;
        $variantSamples = [];
        $variantTotalCount = 0;
        foreach ($rawProducts as $product) {
            $variants = $mapper->mapVariants($product);
            if (!empty($variants)) {
                $hasVariants = true;
                $variantTotalCount = count($variants);
                foreach (array_slice($variants, 0, 3) as $v) {
                    $variantSamples[] = $v;
                }
                break;
            }
        }

        return [
            'fields' => $fields,
            'samples' => $samples,
            'has_variants' => $hasVariants,
            'variant_samples' => $variantSamples,
            'variant_total_count' => $variantTotalCount,
        ];
    }

    protected function fetchContent(XmlSource $source): string
    {
        $url = $source->url;

        if (str_starts_with($url, 'file://')) {
            $path = str_replace('file://', '', $url);
            return $this->parser->fetchFromFile($path);
        }

        // Use cached fetch to avoid 429 rate limits from repeated requests
        return $this->parser->fetchAndCache($url, $source->id);
    }

    protected function applyImportFilters(array $rawProducts, XmlFieldMapper $mapper, array $filters): array
    {
        // Filter by specific product indices
        if (!empty($filters['product_indices'])) {
            $indices = array_flip($filters['product_indices']);
            $rawProducts = array_values(array_filter(
                $rawProducts,
                fn ($product, $index) => isset($indices[$index]),
                ARRAY_FILTER_USE_BOTH,
            ));
        }

        // Filter by categories, excluded categories, or brands (requires mapping each product)
        $hasIncludeCategories = !empty($filters['categories']);
        $hasExcludeCategories = !empty($filters['excluded_categories']);
        $hasBrands = !empty($filters['brands']);

        if ($hasIncludeCategories || $hasExcludeCategories || $hasBrands) {
            $excludedSet = $hasExcludeCategories ? array_flip($filters['excluded_categories']) : [];

            $rawProducts = array_values(array_filter($rawProducts, function ($rawProduct) use ($mapper, $filters, $hasIncludeCategories, $hasExcludeCategories, $hasBrands, $excludedSet) {
                $mapped = $mapper->map($rawProduct);

                // Build full category path
                if (!empty($mapped['_category_parts'])) {
                    $catPath = implode(' > ', $mapped['_category_parts']);
                } else {
                    $mainCat = trim($mapped['category'] ?? '');
                    $subCat = trim($mapped['subcategory'] ?? '');
                    $catPath = ($mainCat && $subCat && $subCat !== $mainCat)
                        ? $mainCat . ' > ' . $subCat
                        : ($mainCat ?: $subCat);
                }

                // Exclude categories
                if ($hasExcludeCategories && isset($excludedSet[$catPath])) {
                    return false;
                }

                // Include only specific categories
                if ($hasIncludeCategories) {
                    if (!in_array($catPath, $filters['categories'], true)) {
                        return false;
                    }
                }

                if ($hasBrands) {
                    $brand = $mapped['brand'] ?? '';
                    if (!in_array($brand, $filters['brands'], true)) {
                        return false;
                    }
                }

                return true;
            }));
        }

        // Apply limit
        if (!empty($filters['limit'])) {
            $rawProducts = array_slice($rawProducts, 0, (int) $filters['limit']);
        }

        return $rawProducts;
    }

    protected function applyPriceAdjustment(array $mapped, float $percent): array
    {
        foreach (['price', 'compare_price', 'cost_price'] as $field) {
            if (!empty($mapped[$field])) {
                $value = $this->parser->parsePrice($mapped[$field]);
                if ($value > 0) {
                    $mapped[$field] = (string) round($value * (1 + $percent / 100), 2);
                }
            }
        }
        return $mapped;
    }

    protected function applyVariantPriceAdjustment(array $variant, float $percent): array
    {
        if (!empty($variant['price'])) {
            $value = $this->parser->parsePrice($variant['price']);
            if ($value > 0) {
                $variant['price'] = (string) round($value * (1 + $percent / 100), 2);
            }
        }
        return $variant;
    }

    protected function upsertProduct(XmlSource $source, array $mapped, array $rawProduct, array $variants, array &$stats, int $productIndex = 0): void
    {
        // SKU: primary identifier for product lookup
        $sku = trim($mapped['sku'] ?? $mapped['barcode'] ?? '');

        // Generate fallback SKU when missing
        if ($sku === '') {
            $sku = 'XML-' . $source->id . '-' . $productIndex . '-' . substr(md5(json_encode($rawProduct)), 0, 8);
        }

        // Barcode: separate field (EAN/GTIN), can be same as SKU if not provided separately
        $mappedBarcode = trim($mapped['barcode'] ?? '');

        DB::transaction(function () use ($source, $mapped, $rawProduct, $variants, $sku, $mappedBarcode, &$stats) {
            $brandId = $this->resolveBrandId($mapped['brand'] ?? null, $source);
            $categoryParts = $mapped['_category_parts'] ?? null;
            $categoryId = $categoryParts
                ? $this->resolveCategoryPath($categoryParts, $source)
                : $this->resolveCategory($mapped['category'] ?? null, $mapped['subcategory'] ?? null, $source);
            $images = $this->parser->extractImages($rawProduct);

            // Calculate total stock from variants if available
            $variantStock = null;
            if (!empty($variants)) {
                $variantStock = array_sum(array_column($variants, 'stock'));
            }
            $stockQuantity = $variantStock ?? (int) ($mapped['stock_quantity'] ?? 0);

            $productData = [
                'name' => $mapped['name'] ?? $sku,
                'description' => $mapped['description'] ?? null,
                'short_description' => $mapped['short_description'] ?? null,
                'price' => $this->parser->parsePrice($mapped['price'] ?? 0),
                'compare_price' => $this->parser->parsePrice($mapped['compare_price'] ?? 0),
                'cost_price' => $this->parser->parsePrice($mapped['cost_price'] ?? 0),
                'stock_quantity' => $stockQuantity,
                'stock_status' => $stockQuantity > 0 ? 'in_stock' : 'out_of_stock',
                'weight' => is_numeric($mapped['weight'] ?? null) ? (float) $mapped['weight'] : null,
                'desi' => is_numeric($mapped['desi'] ?? null) ? (int) round((float) $mapped['desi']) : null,
                'vat_rate' => is_numeric($mapped['tax'] ?? null) ? (int) $mapped['tax'] : 20,
                'currency' => 'TRY',
                'brand_id' => $brandId,
                'category_id' => $categoryId,
                'is_active' => empty($mapped['_zero_price_warning']),
            ];

            // Primary lookup: sku + xml_source_id
            $existing = Product::where('sku', $sku)
                ->where('xml_source_id', $source->id)
                ->first();

            // Fallback: barcode + xml_source_id (backward compatibility)
            if (!$existing) {
                $existing = Product::where('barcode', $sku)
                    ->where('xml_source_id', $source->id)
                    ->first();
            }

            // Barcode: use mapped barcode, fallback to SKU, or generate new
            $barcode = $mappedBarcode ?: $sku;
            if ($source->barcode_regenerate) {
                $barcode = $this->barcodeGenerator->generate($source->barcode_prefix);
            }

            $syncStatus = 'imported';
            $localProductId = null;

            if ($existing) {
                $existing->update($productData);
                $this->syncImages($existing, $images);
                $this->syncVariants($existing, $variants, $stats, $source);
                $stats['updated']++;
                $syncStatus = 'updated';
                $localProductId = $existing->id;
            } else {
                $product = Product::create(array_merge($productData, [
                    'sku' => $sku,
                    'barcode' => $barcode,
                    'xml_source_id' => $source->id,
                ]));
                $this->syncImages($product, $images);
                $this->syncVariants($product, $variants, $stats, $source);
                $stats['created']++;
                $localProductId = $product->id;
            }

            // Populate xml_products tracking table — use original XML price (before rules)
            $xmlPrice = $this->parser->parsePrice($mapped['_original_xml_price'] ?? $mapped['price'] ?? 0);
            $xmlStock = (int) ($mapped['stock_quantity'] ?? 0);

            $existingXmlProduct = XmlProduct::where('xml_source_id', $source->id)
                ->where('external_sku', $sku)
                ->first();

            $changesDetected = null;
            if ($existingXmlProduct && $existingXmlProduct->mapped_data) {
                $changesDetected = $this->detectChanges($existingXmlProduct->mapped_data, $mapped);
            }

            if ($changesDetected) {
                $priceChanged = isset($changesDetected['price']);
                $stockChanged = isset($changesDetected['stock_quantity']);
                if ($priceChanged || $stockChanged) {
                    XmlUpdateLog::create([
                        'xml_source_id' => $source->id,
                        'product_id' => $localProductId,
                        'product_name' => $mapped['name'] ?? $sku,
                        'change_type' => ($priceChanged && $stockChanged) ? 'both' : ($priceChanged ? 'price' : 'stock'),
                        'old_price' => $changesDetected['price']['old'] ?? null,
                        'new_price' => $changesDetected['price']['new'] ?? null,
                        'old_stock' => $changesDetected['stock_quantity']['old'] ?? null,
                        'new_stock' => $changesDetected['stock_quantity']['new'] ?? null,
                        'source_name' => $source->name,
                    ]);
                }
            }

            XmlProduct::updateOrCreate(
                ['xml_source_id' => $source->id, 'external_sku' => $sku],
                [
                    'provider' => $source->name,
                    'external_name' => $mapped['name'] ?? $sku,
                    'raw_data' => $rawProduct,
                    'mapped_data' => $mapped,
                    'local_product_id' => $localProductId,
                    'sync_status' => $syncStatus,
                    'price_in_xml' => $xmlPrice,
                    'stock_in_xml' => $xmlStock,
                    'last_seen_at' => now(),
                    'changes_detected' => $changesDetected,
                ],
            );
        });
    }

    /**
     * Detect changes between old mapped data and new mapped data.
     */
    protected function detectChanges(?array $oldData, array $newData): ?array
    {
        if (!$oldData) {
            return null;
        }

        $changes = [];
        $fieldsToCompare = ['name', 'price', 'stock_quantity', 'barcode', 'brand', 'category'];

        foreach ($fieldsToCompare as $field) {
            $oldValue = $oldData[$field] ?? null;
            $newValue = $newData[$field] ?? null;

            if ((string) $oldValue !== (string) $newValue) {
                $changes[$field] = [
                    'old' => $oldValue,
                    'new' => $newValue,
                ];
            }
        }

        return !empty($changes) ? $changes : null;
    }

    protected function loadMappingsCache(XmlSource $source): void
    {
        $this->categoryMappingsCache = $source->categoryMappings()
            ->get()
            ->keyBy('xml_category_path')
            ->toArray();

        $this->brandMappingsCache = $source->brandMappings()
            ->get()
            ->keyBy(fn ($m) => mb_strtolower($m['xml_brand_name']))
            ->toArray();
    }

    protected function resolveBrandId(?string $brandName, ?XmlSource $source = null): ?int
    {
        if (!$brandName || trim($brandName) === '') {
            return null;
        }

        $brandName = trim($brandName);

        // Check brand mapping
        if ($this->brandMappingsCache !== null) {
            $key = mb_strtolower($brandName);
            if (isset($this->brandMappingsCache[$key])) {
                $mapping = $this->brandMappingsCache[$key];
                // If mapped to existing brand
                if (!empty($mapping['local_brand_id'])) {
                    return (int) $mapping['local_brand_id'];
                }
                // If renamed
                if (!empty($mapping['local_brand_name'])) {
                    $brandName = $mapping['local_brand_name'];
                }
            }
        }

        $brand = Brand::firstOrCreate(
            ['name' => $brandName],
            ['is_active' => true],
        );

        return $brand->id;
    }

    protected function resolveCategory(?string $mainCategory, ?string $subCategory, ?XmlSource $source = null): ?int
    {
        if (!$mainCategory || trim($mainCategory) === '') {
            return null;
        }

        $mainName = trim($mainCategory);
        $subName = ($subCategory && trim($subCategory) !== '' && trim($subCategory) !== $mainName)
            ? trim($subCategory)
            : null;

        // Build category path for mapping lookup
        $catPath = $subName ? ($mainName . ' > ' . $subName) : $mainName;

        // Check category mapping
        if ($this->categoryMappingsCache !== null && isset($this->categoryMappingsCache[$catPath])) {
            $mapping = $this->categoryMappingsCache[$catPath];
            if (!empty($mapping['local_category_id'])) {
                return (int) $mapping['local_category_id'];
            }
            // If create_if_missing is false and no local_category_id, skip category assignment
            if (empty($mapping['create_if_missing'])) {
                return null;
            }
        }

        // Default: auto-create categories
        $parent = Category::firstOrCreate(
            ['name' => $mainName, 'parent_id' => null],
            ['is_active' => true, 'sort_order' => 0],
        );

        if ($subName) {
            $child = Category::firstOrCreate(
                ['name' => $subName, 'parent_id' => $parent->id],
                ['is_active' => true, 'sort_order' => 0],
            );
            return $child->id;
        }

        return $parent->id;
    }

    /**
     * Resolve a full category path array into nested categories.
     * e.g. ['Giyim', 'Kadın', 'Elbise', 'Mini'] → creates 4-level nested category, returns leaf ID.
     */
    protected function resolveCategoryPath(array $parts, ?XmlSource $source = null): ?int
    {
        if (empty($parts)) {
            return null;
        }

        // Build full path string for mapping lookup
        $catPath = implode(' > ', $parts);

        // Check category mapping cache
        if ($this->categoryMappingsCache !== null && isset($this->categoryMappingsCache[$catPath])) {
            $mapping = $this->categoryMappingsCache[$catPath];
            if (!empty($mapping['local_category_id'])) {
                return (int) $mapping['local_category_id'];
            }
            if (empty($mapping['create_if_missing'])) {
                return null;
            }
        }

        // Auto-create nested categories
        $parentId = null;
        $lastCategory = null;

        foreach ($parts as $depth => $name) {
            $name = trim($name);
            if ($name === '') {
                continue;
            }

            $category = Category::firstOrCreate(
                ['name' => $name, 'parent_id' => $parentId],
                ['is_active' => true, 'sort_order' => 0],
            );

            $parentId = $category->id;
            $lastCategory = $category;
        }

        return $lastCategory?->id;
    }

    protected function syncImages(Product $product, array $imageUrls): void
    {
        if (empty($imageUrls)) {
            return;
        }

        $existingUrls = $product->images()->pluck('image_url')->toArray();
        $sortOrder = $product->images()->max('sort_order') ?? 0;

        foreach ($imageUrls as $index => $url) {
            if (in_array($url, $existingUrls)) {
                continue;
            }

            $sortOrder++;
            ProductImage::create([
                'product_id' => $product->id,
                'image_url' => $url,
                'sort_order' => $sortOrder,
                'is_main' => $index === 0 && empty($existingUrls),
            ]);
        }
    }

    protected function syncVariants(Product $product, array $variants, array &$stats, ?XmlSource $source = null): void
    {
        if (empty($variants)) {
            return;
        }

        foreach ($variants as $vi => $variantData) {
            $variantSku = $variantData['sku'] ?? $variantData['barcode'] ?? null;
            if (!$variantSku) {
                // Generate a fallback SKU from product SKU + variant index
                $variantSku = $product->sku . '-V' . ($vi + 1);
            }

            $variantBarcode = $variantData['barcode'] ?? null;
            if ($source && $source->barcode_regenerate) {
                // Only generate for new variants
                $existingVariant = ProductVariant::where('sku', $variantSku)->where('product_id', $product->id)->first();
                if (!$existingVariant) {
                    $variantBarcode = $this->barcodeGenerator->generate($source->barcode_prefix);
                } else {
                    $variantBarcode = $existingVariant->barcode;
                }
            }

            // Upsert ProductVariant by sku + product_id
            $productVariant = ProductVariant::updateOrCreate(
                [
                    'sku' => $variantSku,
                    'product_id' => $product->id,
                ],
                [
                    'barcode' => $variantBarcode,
                    'stock_quantity' => $variantData['stock'] ?? 0,
                    'price' => $variantData['price'] ? $this->parser->parsePrice($variantData['price']) : null,
                    'is_active' => true,
                ],
            );

            // Sync variant options (e.g., Beden: 42, Renk: Siyah)
            foreach ($variantData['options'] as $option) {
                $typeName = $option['type'];
                $typeValue = $option['value'];

                // VariantType firstOrCreate
                $variantType = VariantType::firstOrCreate(
                    ['name' => $typeName],
                );

                // VariantOption firstOrCreate
                $variantOption = VariantOption::firstOrCreate(
                    ['variant_type_id' => $variantType->id, 'value' => $typeValue],
                );

                // ProductVariantType link (product <-> variant_type)
                ProductVariantType::firstOrCreate([
                    'product_id' => $product->id,
                    'variant_type_id' => $variantType->id,
                ]);

                // ProductVariantValue pivot (variant <-> option)
                ProductVariantValue::firstOrCreate([
                    'product_variant_id' => $productVariant->id,
                    'variant_option_id' => $variantOption->id,
                ]);
            }

            // Sync variant images
            if (!empty($variantData['images'])) {
                $existingImgUrls = $productVariant->images()->pluck('image_url')->toArray();
                $sortOrder = $productVariant->images()->max('sort_order') ?? 0;

                foreach ($variantData['images'] as $imgIndex => $imgUrl) {
                    if (in_array($imgUrl, $existingImgUrls)) {
                        continue;
                    }

                    $sortOrder++;
                    ProductVariantImage::create([
                        'product_variant_id' => $productVariant->id,
                        'image_url' => $imgUrl,
                        'sort_order' => $sortOrder,
                        'is_main' => $imgIndex === 0 && empty($existingImgUrls),
                    ]);
                }
            }
        }
    }
}
