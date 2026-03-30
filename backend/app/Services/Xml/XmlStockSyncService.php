<?php

namespace App\Services\Xml;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\XmlSource;
use App\Models\XmlStockSyncLog;
use App\Models\XmlUpdateLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class XmlStockSyncService
{
    public function __construct(
        protected XmlParserService $parser,
        protected XmlPricingService $pricingService,
    ) {}

    public function sync(XmlSource $source): XmlStockSyncLog
    {
        $startedAt = now();
        $errors = [];
        $stats = [
            'xml_product_count' => 0,
            'matched_products' => 0,
            'stock_changed_products' => 0,
            'price_changed_products' => 0,
            'matched_variants' => 0,
            'stock_changed_variants' => 0,
            'unmatched_count' => 0,
            'failed' => 0,
        ];
        $changedProductIds = [];

        try {
            // 1. XML fetch + parse
            $xmlContent = $this->parser->fetchAndCache($source->url, $source->id);
            $xml = $this->parser->parseXml($xmlContent);

            $mappingConfig = $source->mapping_config ?? [];
            $mapper = new XmlFieldMapper($mappingConfig);

            $xmlProducts = $this->parser->extractProducts(
                $xml,
                $mapper->getProductNode(),
                $mapper->getWrapperNode()
            );

            $stats['xml_product_count'] = count($xmlProducts);

            // 2. DB'den lookup map'leri oluştur
            $dbProducts = Product::where('xml_source_id', $source->id)
                ->select('id', 'sku', 'barcode', 'name', 'stock_quantity', 'price', 'compare_price')
                ->get();

            $skuMap = [];
            $barcodeMap = [];
            $nameMap = [];
            foreach ($dbProducts as $product) {
                if ($product->sku) {
                    $skuMap[strtolower($product->sku)] = $product;
                }
                if ($product->barcode) {
                    $barcodeMap[strtolower($product->barcode)] = $product;
                }
                if ($product->name) {
                    $nameMap[strtolower(trim($product->name))] = $product;
                }
            }

            $dbVariants = ProductVariant::whereIn('product_id', $dbProducts->pluck('id'))
                ->select('id', 'product_id', 'sku', 'barcode', 'stock_quantity')
                ->get();

            $variantSkuMap = [];
            $variantBarcodeMap = [];
            foreach ($dbVariants as $variant) {
                if ($variant->sku) {
                    $variantSkuMap[strtolower($variant->sku)] = $variant;
                }
                if ($variant->barcode) {
                    $variantBarcodeMap[strtolower($variant->barcode)] = $variant;
                }
            }

            // 3. XML iterate — in-memory eşleştirme
            $productStockUpdates = []; // [id => new_stock]
            $productPriceUpdates = []; // [id => ['price' => x, 'compare_price' => y]]
            $variantUpdates = []; // [id => new_stock]
            $productVariantStocks = []; // [product_id => total_variant_stock]

            foreach ($xmlProducts as $index => $xmlProduct) {
                $mapped = $mapper->map($xmlProduct);
                $xmlSku = $mapped['barcode'] ?? null; // barcode field = SKU in our mapping
                $xmlStock = (int) ($mapped['stock_quantity'] ?? 0);

                // SKU ile eşleştir
                $dbProduct = null;
                if ($xmlSku) {
                    $dbProduct = $skuMap[strtolower($xmlSku)] ?? $barcodeMap[strtolower($xmlSku)] ?? null;
                }

                // Fallback 1: XML-{source_id}-{index}-{hash} formatıyla eşleştir
                if (!$dbProduct) {
                    $generatedSku = 'XML-' . $source->id . '-' . $index . '-' . substr(md5(json_encode($xmlProduct)), 0, 8);
                    $dbProduct = $skuMap[strtolower($generatedSku)] ?? null;
                }

                // Fallback 2: Ürün adıyla eşleştir
                if (!$dbProduct) {
                    $xmlName = $mapped['name'] ?? null;
                    if ($xmlName) {
                        $dbProduct = $nameMap[strtolower(trim($xmlName))] ?? null;
                    }
                }

                if (!$dbProduct) {
                    $stats['unmatched_count']++;
                    continue;
                }

                $stats['matched_products']++;

                // Varyantları işle
                $xmlVariants = $mapper->mapVariants($xmlProduct);
                $hasVariants = !empty($xmlVariants);
                $totalVariantStock = 0;

                if ($hasVariants) {
                    foreach ($xmlVariants as $xmlVariant) {
                        $vSku = $xmlVariant['sku'] ?? null;
                        $vBarcode = $xmlVariant['barcode'] ?? null;
                        $vStock = (int) ($xmlVariant['stock'] ?? 0);

                        $dbVariant = null;
                        if ($vSku) {
                            $dbVariant = $variantSkuMap[strtolower($vSku)] ?? null;
                        }
                        if (!$dbVariant && $vBarcode) {
                            $dbVariant = $variantBarcodeMap[strtolower($vBarcode)] ?? null;
                        }

                        if ($dbVariant && $dbVariant->product_id === $dbProduct->id) {
                            $stats['matched_variants']++;
                            $totalVariantStock += $vStock;

                            if ((int) $dbVariant->stock_quantity !== $vStock) {
                                $variantUpdates[$dbVariant->id] = $vStock;
                                $stats['stock_changed_variants']++;
                            }
                        }

                        // Eşleşmeyen varyantlar için totalVariantStock'a yine ekle
                        if (!$dbVariant || $dbVariant->product_id !== $dbProduct->id) {
                            $totalVariantStock += $vStock;
                        }
                    }
                }

                // Ana ürün stoğu: varyant varsa toplam, yoksa XML stoku
                $newProductStock = $hasVariants ? $totalVariantStock : $xmlStock;

                // Fiyat hesapla (price rules dahil)
                $xmlPrice = $this->parser->parsePrice($mapped['price'] ?? 0);
                $xmlComparePrice = $this->parser->parsePrice($mapped['compare_price'] ?? 0);
                $categoryPath = $mapped['category'] ?? '';
                $brand = $mapped['brand'] ?? null;

                $adjusted = $this->pricingService->applyRules(
                    $source,
                    $xmlPrice,
                    $xmlComparePrice > 0 ? $xmlComparePrice : null,
                    $categoryPath,
                    $brand,
                );

                $newPrice = $adjusted['price'];
                $newComparePrice = $adjusted['compare_price'];
                $zeroPriceWarning = $adjusted['zero_price_warning'] ?? false;

                $stockChanged = (int) $dbProduct->stock_quantity !== $newProductStock;
                $priceChanged = !$zeroPriceWarning && abs((float) $dbProduct->price - $newPrice) >= 0.01;

                if ($stockChanged) {
                    $productStockUpdates[$dbProduct->id] = $newProductStock;
                    $stats['stock_changed_products']++;
                }

                if ($priceChanged) {
                    $productPriceUpdates[$dbProduct->id] = [
                        'price' => $newPrice,
                        'compare_price' => $newComparePrice,
                    ];
                    $stats['price_changed_products']++;
                }

                if ($stockChanged || $priceChanged) {
                    $changedProductIds[] = $dbProduct->id;

                    XmlUpdateLog::create([
                        'xml_source_id' => $source->id,
                        'product_id' => $dbProduct->id,
                        'product_name' => $dbProduct->name,
                        'change_type' => ($stockChanged && $priceChanged) ? 'both' : ($priceChanged ? 'price' : 'stock'),
                        'old_price' => $priceChanged ? (float) $dbProduct->price : null,
                        'new_price' => $priceChanged ? $newPrice : null,
                        'old_stock' => $stockChanged ? (int) $dbProduct->stock_quantity : null,
                        'new_stock' => $stockChanged ? $newProductStock : null,
                        'source_name' => $source->name,
                    ]);
                }
            }

            // 4. Batch update — 500'lük chunk'lar
            DB::transaction(function () use ($productStockUpdates, $productPriceUpdates, $variantUpdates) {
                $this->batchUpdateStock('products', $productStockUpdates);
                $this->batchUpdateStock('product_variants', $variantUpdates);
                $this->batchUpdatePrices($productPriceUpdates);
            });

            // stock_status güncelle
            if (!empty($productStockUpdates)) {
                $zeroStockIds = array_keys(array_filter($productStockUpdates, fn($stock) => $stock <= 0));
                $inStockIds = array_keys(array_filter($productStockUpdates, fn($stock) => $stock > 0));

                if (!empty($zeroStockIds)) {
                    Product::whereIn('id', $zeroStockIds)->update(['stock_status' => 'out_of_stock']);
                }
                if (!empty($inStockIds)) {
                    Product::whereIn('id', $inStockIds)
                        ->where('stock_status', 'out_of_stock')
                        ->update(['stock_status' => 'in_stock']);
                }
            }

        } catch (\Throwable $e) {
            $stats['failed']++;
            $errors[] = [
                'type' => 'sync_error',
                'message' => $e->getMessage(),
                'file' => $e->getFile() . ':' . $e->getLine(),
            ];
            Log::error('XML Stock Sync failed', [
                'source_id' => $source->id,
                'error' => $e->getMessage(),
            ]);
        }

        $completedAt = now();

        // 5. Log kaydet
        $log = XmlStockSyncLog::create([
            'xml_source_id' => $source->id,
            'xml_product_count' => $stats['xml_product_count'],
            'matched_products' => $stats['matched_products'],
            'stock_changed_products' => $stats['stock_changed_products'],
            'matched_variants' => $stats['matched_variants'],
            'stock_changed_variants' => $stats['stock_changed_variants'],
            'unmatched_count' => $stats['unmatched_count'],
            'failed' => $stats['failed'],
            'error_log' => !empty($errors) ? $errors : null,
            'changes_summary' => [
                'changed_product_ids' => $changedProductIds,
                'product_stock_updates_count' => count($productStockUpdates ?? []),
                'product_price_updates_count' => count($productPriceUpdates ?? []),
                'variant_updates_count' => count($variantUpdates ?? []),
            ],
            'duration_seconds' => $startedAt->diffInSeconds($completedAt),
            'started_at' => $startedAt,
            'completed_at' => $completedAt,
        ]);

        // last_stock_synced_at güncelle
        $source->update(['last_stock_synced_at' => $completedAt]);

        return $log;
    }

    protected function batchUpdatePrices(array $updates): void
    {
        if (empty($updates)) {
            return;
        }

        foreach (array_chunk($updates, 500, true) as $chunk) {
            $priceCases = [];
            $compareCases = [];
            $ids = [];
            $bindings = [];
            $compareBindings = [];

            foreach ($chunk as $id => $data) {
                $priceCases[] = "WHEN id = ? THEN ?";
                $bindings[] = $id;
                $bindings[] = $data['price'];

                $compareCases[] = "WHEN id = ? THEN ?";
                $compareBindings[] = $id;
                $compareBindings[] = $data['compare_price'];

                $ids[] = $id;
            }

            $priceSql = implode(' ', $priceCases);
            $compareSql = implode(' ', $compareCases);
            $idPlaceholders = implode(',', array_fill(0, count($ids), '?'));
            $allBindings = array_merge($bindings, $compareBindings, $ids);

            DB::statement(
                "UPDATE `products` SET `price` = CASE {$priceSql} END, `compare_price` = CASE {$compareSql} END, `updated_at` = NOW() WHERE `id` IN ({$idPlaceholders})",
                $allBindings
            );
        }
    }

    protected function batchUpdateStock(string $table, array $updates): void
    {
        if (empty($updates)) {
            return;
        }

        foreach (array_chunk($updates, 500, true) as $chunk) {
            $cases = [];
            $ids = [];
            $bindings = [];

            foreach ($chunk as $id => $stock) {
                $cases[] = "WHEN id = ? THEN ?";
                $bindings[] = $id;
                $bindings[] = $stock;
                $ids[] = $id;
            }

            $caseSql = implode(' ', $cases);
            $idPlaceholders = implode(',', array_fill(0, count($ids), '?'));
            $bindings = array_merge($bindings, $ids);

            DB::statement(
                "UPDATE `{$table}` SET `stock_quantity` = CASE {$caseSql} END, `updated_at` = NOW() WHERE `id` IN ({$idPlaceholders})",
                $bindings
            );
        }
    }
}
