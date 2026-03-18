<?php

namespace App\Services\Xml;

use App\Models\BulkOperationLog;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\XmlSource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class XmlBulkOperationService
{
    /**
     * Append "-{suffix}" to barcodes. Idempotent: skips if suffix already present.
     */
    public function bulkModifyBarcodeSuffix(XmlSource $source, string $suffix, array $productIds = []): array
    {
        $suffixPart = '-' . $suffix;
        $stats = ['products_updated' => 0, 'variants_updated' => 0, 'skipped' => 0];
        $originals = [];

        $query = Product::where('xml_source_id', $source->id);
        if (!empty($productIds)) {
            $query->whereIn('id', $productIds);
        }

        $query->chunkById(100, function ($products) use ($suffixPart, &$stats, &$originals) {
            foreach ($products as $product) {
                if (!$product->barcode || str_ends_with($product->barcode, $suffixPart)) {
                    $stats['skipped']++;
                    continue;
                }

                $originals["p_{$product->id}"] = ['barcode' => $product->barcode];
                $product->update(['barcode' => $product->barcode . $suffixPart]);
                $stats['products_updated']++;

                $variants = ProductVariant::where('product_id', $product->id)
                    ->whereNotNull('barcode')
                    ->where('barcode', '!=', '')
                    ->get();

                foreach ($variants as $variant) {
                    if (str_ends_with($variant->barcode, $suffixPart)) {
                        continue;
                    }
                    $originals["v_{$variant->id}"] = ['barcode' => $variant->barcode];
                    $variant->update(['barcode' => $variant->barcode . $suffixPart]);
                    $stats['variants_updated']++;
                }
            }
        });

        if ($stats['products_updated'] > 0) {
            $this->saveLog($source, 'barcode_suffix', ['suffix' => $suffix], $originals, $stats['products_updated'] + $stats['variants_updated']);
        }

        return $stats;
    }

    /**
     * Append "-{suffix}" to SKUs. Idempotent: skips if suffix already present.
     */
    public function bulkModifySkuSuffix(XmlSource $source, string $suffix, array $productIds = []): array
    {
        $suffixPart = '-' . $suffix;
        $stats = ['products_updated' => 0, 'variants_updated' => 0, 'skipped' => 0];
        $originals = [];

        $query = Product::where('xml_source_id', $source->id);
        if (!empty($productIds)) {
            $query->whereIn('id', $productIds);
        }

        $query->chunkById(100, function ($products) use ($suffixPart, &$stats, &$originals) {
            foreach ($products as $product) {
                if (!$product->sku || str_ends_with($product->sku, $suffixPart)) {
                    $stats['skipped']++;
                    continue;
                }

                $originals["p_{$product->id}"] = ['sku' => $product->sku];
                $product->update(['sku' => $product->sku . $suffixPart]);
                $stats['products_updated']++;

                $variants = ProductVariant::where('product_id', $product->id)
                    ->whereNotNull('sku')
                    ->where('sku', '!=', '')
                    ->get();

                foreach ($variants as $variant) {
                    if (str_ends_with($variant->sku, $suffixPart)) {
                        continue;
                    }
                    $originals["v_{$variant->id}"] = ['sku' => $variant->sku];
                    $variant->update(['sku' => $variant->sku . $suffixPart]);
                    $stats['variants_updated']++;
                }
            }
        });

        if ($stats['products_updated'] > 0) {
            $this->saveLog($source, 'sku_suffix', ['suffix' => $suffix], $originals, $stats['products_updated'] + $stats['variants_updated']);
        }

        return $stats;
    }

    /**
     * Add prefix or suffix to product names. Idempotent: skips if already applied. Regenerates slugs.
     */
    public function bulkModifyProductName(XmlSource $source, string $mode, string $value, array $productIds = []): array
    {
        $stats = ['products_updated' => 0, 'skipped' => 0];
        $originals = [];

        $query = Product::where('xml_source_id', $source->id);
        if (!empty($productIds)) {
            $query->whereIn('id', $productIds);
        }

        $query->chunkById(100, function ($products) use ($mode, $value, &$stats, &$originals) {
            foreach ($products as $product) {
                // Idempotent: skip if prefix/suffix already applied
                if ($mode === 'prefix' && str_starts_with($product->name, $value . ' ')) {
                    $stats['skipped']++;
                    continue;
                }
                if ($mode === 'suffix' && str_ends_with($product->name, ' ' . $value)) {
                    $stats['skipped']++;
                    continue;
                }

                $originals["p_{$product->id}"] = ['name' => $product->name, 'slug' => $product->slug];

                $newName = $mode === 'prefix'
                    ? $value . ' ' . $product->name
                    : $product->name . ' ' . $value;

                $product->update([
                    'name' => $newName,
                    'slug' => Str::slug($newName) . '-' . $product->id,
                ]);
                $stats['products_updated']++;
            }
        });

        if ($stats['products_updated'] > 0) {
            $this->saveLog($source, 'name_modify', ['mode' => $mode, 'value' => $value], $originals, $stats['products_updated']);
        }

        return $stats;
    }

    /**
     * Adjust prices by percentage or fixed amount. Never goes below 0.01.
     */
    public function bulkAdjustPrices(XmlSource $source, string $type, float $value, array $productIds = []): array
    {
        $stats = ['products_updated' => 0, 'variants_updated' => 0];

        $query = Product::where('xml_source_id', $source->id);
        if (!empty($productIds)) {
            $query->whereIn('id', $productIds);
        }

        $query->chunkById(100, function ($products) use ($type, $value, &$stats) {
            foreach ($products as $product) {
                $newPrice = $this->calculateNewPrice((float) $product->price, $type, $value);
                $updateData = ['price' => $newPrice];

                if ($product->compare_price > 0) {
                    $updateData['compare_price'] = $this->calculateNewPrice((float) $product->compare_price, $type, $value);
                }

                $product->update($updateData);
                $stats['products_updated']++;

                // Update variant prices
                $variants = ProductVariant::where('product_id', $product->id)
                    ->whereNotNull('price')
                    ->where('price', '>', 0)
                    ->get();

                foreach ($variants as $variant) {
                    $variant->update([
                        'price' => $this->calculateNewPrice((float) $variant->price, $type, $value),
                    ]);
                    $stats['variants_updated']++;
                }
            }
        });

        return $stats;
    }

    /**
     * Read-only preview of bulk changes. Returns first N products' before/after values.
     */
    public function previewBulkChanges(XmlSource $source, string $operation, array $params, int $limit = 10): array
    {
        $query = Product::where('xml_source_id', $source->id);
        if (!empty($params['product_ids'])) {
            $query->whereIn('id', $params['product_ids']);
        }

        $products = $query->limit($limit)->get();
        $previews = [];

        foreach ($products as $product) {
            $preview = [
                'id' => $product->id,
                'name' => $product->name,
                'before' => [],
                'after' => [],
            ];

            switch ($operation) {
                case 'barcode_suffix':
                    $suffixPart = '-' . ($params['suffix'] ?? '');
                    $preview['before']['barcode'] = $product->barcode;
                    $preview['after']['barcode'] = ($product->barcode && !str_ends_with($product->barcode, $suffixPart))
                        ? $product->barcode . $suffixPart
                        : $product->barcode;
                    break;

                case 'sku_suffix':
                    $suffixPart = '-' . ($params['suffix'] ?? '');
                    $preview['before']['sku'] = $product->sku;
                    $preview['after']['sku'] = ($product->sku && !str_ends_with($product->sku, $suffixPart))
                        ? $product->sku . $suffixPart
                        : $product->sku;
                    break;

                case 'name_modify':
                    $mode = $params['mode'] ?? 'prefix';
                    $val = $params['value'] ?? '';
                    $preview['before']['name'] = $product->name;
                    $preview['after']['name'] = $mode === 'prefix'
                        ? $val . ' ' . $product->name
                        : $product->name . ' ' . $val;
                    break;

                case 'price_adjust':
                    $type = $params['type'] ?? 'percentage';
                    $val = (float) ($params['value'] ?? 0);
                    $preview['before']['price'] = (float) $product->price;
                    $preview['after']['price'] = $this->calculateNewPrice((float) $product->price, $type, $val);
                    if ($product->compare_price > 0) {
                        $preview['before']['compare_price'] = (float) $product->compare_price;
                        $preview['after']['compare_price'] = $this->calculateNewPrice((float) $product->compare_price, $type, $val);
                    }
                    break;
            }

            $previews[] = $preview;
        }

        return $previews;
    }

    /**
     * Revert a bulk operation using saved original values.
     */
    public function revert(int $logId): array
    {
        $log = BulkOperationLog::findOrFail($logId);

        if ($log->reverted) {
            return ['error' => 'Bu işlem zaten geri alınmış.'];
        }

        $restored = 0;

        DB::transaction(function () use ($log, &$restored) {
            foreach ($log->original_values as $key => $fields) {
                [$type, $id] = explode('_', $key, 2);

                if ($type === 'p') {
                    $product = Product::find((int) $id);
                    if ($product) {
                        $product->update($fields);
                        $restored++;
                    }
                } elseif ($type === 'v') {
                    $variant = ProductVariant::find((int) $id);
                    if ($variant) {
                        $variant->update($fields);
                        $restored++;
                    }
                }
            }

            $log->update(['reverted' => true, 'reverted_at' => now()]);
        });

        return ['restored' => $restored];
    }

    /**
     * Get operation history for a source.
     */
    public function getHistory(XmlSource $source): array
    {
        return BulkOperationLog::where('xml_source_id', $source->id)
            ->select(['id', 'xml_source_id', 'operation', 'params', 'affected_count', 'reverted', 'reverted_at', 'created_at'])
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->toArray();
    }

    private function saveLog(XmlSource $source, string $operation, array $params, array $originals, int $affectedCount): void
    {
        BulkOperationLog::create([
            'xml_source_id' => $source->id,
            'operation' => $operation,
            'params' => $params,
            'original_values' => $originals,
            'affected_count' => $affectedCount,
        ]);
    }

    private function calculateNewPrice(float $currentPrice, string $type, float $value): float
    {
        if ($type === 'percentage') {
            $newPrice = $currentPrice * (1 + $value / 100);
        } else {
            $newPrice = $currentPrice + $value;
        }

        return max(0.01, round($newPrice, 2));
    }
}
