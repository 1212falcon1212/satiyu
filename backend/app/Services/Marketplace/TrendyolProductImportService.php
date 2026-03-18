<?php

namespace App\Services\Marketplace;

use App\Models\MarketplaceCredential;
use App\Models\MarketplaceProduct;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\Log;

class TrendyolProductImportService
{
    public function import(MarketplaceCredential $credential): array
    {
        $apiService = new TrendyolApiService($credential);

        $stats = [
            'total_trendyol' => 0,
            'matched' => 0,
            'unmatched' => 0,
            'created' => 0,
            'updated' => 0,
            'errors' => [],
            'unmatched_items' => [],
        ];

        // 1. Fetch all products from Trendyol API (paginated)
        $allTrendyolProducts = $this->fetchAllProducts($apiService);
        $stats['total_trendyol'] = count($allTrendyolProducts);

        // 2. Build barcode/sku lookup indexes from local DB
        $variantByBarcode = ProductVariant::whereNotNull('barcode')
            ->where('barcode', '!=', '')
            ->pluck('product_id', 'barcode')
            ->toArray();

        $variantBySku = ProductVariant::whereNotNull('sku')
            ->where('sku', '!=', '')
            ->pluck('product_id', 'sku')
            ->toArray();

        $productByBarcode = Product::whereNotNull('barcode')
            ->where('barcode', '!=', '')
            ->pluck('id', 'barcode')
            ->toArray();

        $productBySku = Product::whereNotNull('sku')
            ->where('sku', '!=', '')
            ->pluck('id', 'sku')
            ->toArray();

        // 3. Group Trendyol products by productMainId
        $grouped = [];
        foreach ($allTrendyolProducts as $tp) {
            $mainId = $tp['productMainId'] ?? null;
            if (!$mainId) {
                continue;
            }
            $grouped[$mainId][] = $tp;
        }

        // 4. Process each productMainId group
        foreach ($grouped as $mainId => $trendyolItems) {
            try {
                $this->processProductGroup(
                    $mainId,
                    $trendyolItems,
                    $variantByBarcode,
                    $variantBySku,
                    $productByBarcode,
                    $productBySku,
                    $stats,
                );
            } catch (\Throwable $e) {
                $stats['errors'][] = [
                    'productMainId' => $mainId,
                    'message' => $e->getMessage(),
                ];

                Log::error('TrendyolProductImport error', [
                    'productMainId' => $mainId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $stats;
    }

    private function fetchAllProducts(TrendyolApiService $apiService): array
    {
        $all = [];
        $page = 0;
        $size = 200;

        do {
            $result = $apiService->getProducts(['page' => $page, 'size' => $size]);
            $products = $result['products'] ?? [];
            $totalPages = $result['totalPages'] ?? 0;

            foreach ($products as $product) {
                $all[] = $product;
            }

            $page++;
        } while ($page < $totalPages);

        return $all;
    }

    private function processProductGroup(
        string $mainId,
        array $trendyolItems,
        array $variantByBarcode,
        array $variantBySku,
        array $productByBarcode,
        array $productBySku,
        array &$stats,
    ): void {
        $productId = null;

        // Try to match any barcode/stockCode from the group to a local product
        foreach ($trendyolItems as $item) {
            $barcode = $item['barcode'] ?? null;
            $stockCode = $item['stockCode'] ?? null;

            // Priority: variant barcode → variant sku → product barcode → product sku
            if ($barcode && isset($variantByBarcode[$barcode])) {
                $productId = $variantByBarcode[$barcode];
                break;
            }
            if ($stockCode && isset($variantBySku[$stockCode])) {
                $productId = $variantBySku[$stockCode];
                break;
            }
            if ($barcode && isset($productByBarcode[$barcode])) {
                $productId = $productByBarcode[$barcode];
                break;
            }
            if ($stockCode && isset($productBySku[$stockCode])) {
                $productId = $productBySku[$stockCode];
                break;
            }
        }

        if (!$productId) {
            $stats['unmatched']++;
            $first = $trendyolItems[0];
            $stats['unmatched_items'][] = [
                'productMainId' => $mainId,
                'title' => $first['title'] ?? '',
                'barcode' => $first['barcode'] ?? '',
                'stockCode' => $first['stockCode'] ?? '',
            ];
            return;
        }

        $stats['matched']++;

        // Determine status from first item
        $firstItem = $trendyolItems[0];
        $status = $this->resolveStatus($firstItem);

        // Price from first item
        $price = $firstItem['listPrice'] ?? null;
        $salePrice = $firstItem['salePrice'] ?? null;

        // Build variant data
        $variantsData = [];
        $lastKnownStock = [];
        foreach ($trendyolItems as $item) {
            $bc = $item['barcode'] ?? '';
            $variantsData[$bc] = [
                'barcode' => $bc,
                'stockCode' => $item['stockCode'] ?? '',
                'quantity' => $item['quantity'] ?? 0,
                'salePrice' => $item['salePrice'] ?? 0,
                'listPrice' => $item['listPrice'] ?? 0,
            ];
            $lastKnownStock[$bc] = $item['quantity'] ?? 0;
        }

        $listingData = [];
        if (count($trendyolItems) > 1) {
            $listingData['variants'] = $variantsData;
        }
        $listingData['last_known_stock'] = $lastKnownStock;

        // Upsert marketplace_products
        $existing = MarketplaceProduct::where('product_id', $productId)
            ->where('marketplace', 'trendyol')
            ->first();

        if ($existing) {
            $existing->update([
                'marketplace_product_id' => $mainId,
                'marketplace_barcode' => $firstItem['barcode'] ?? null,
                'status' => $status,
                'price' => $price,
                'sale_price' => $salePrice,
                'listing_data' => $listingData,
                'last_synced_at' => now(),
            ]);
            $stats['updated']++;
        } else {
            MarketplaceProduct::create([
                'product_id' => $productId,
                'marketplace' => 'trendyol',
                'marketplace_product_id' => $mainId,
                'marketplace_barcode' => $firstItem['barcode'] ?? null,
                'status' => $status,
                'price' => $price,
                'sale_price' => $salePrice,
                'listing_data' => $listingData,
                'last_synced_at' => now(),
            ]);
            $stats['created']++;
        }
    }

    private function resolveStatus(array $trendyolProduct): string
    {
        if (!empty($trendyolProduct['onSale'])) {
            return 'on_sale';
        }

        if (!empty($trendyolProduct['approved'])) {
            return 'approved';
        }

        if (!empty($trendyolProduct['rejected'])) {
            return 'rejected';
        }

        return 'pending';
    }
}
