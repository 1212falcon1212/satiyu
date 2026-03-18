<?php

namespace App\Services\Marketplace;

use App\Models\MarketplaceCredential;
use App\Models\MarketplaceProduct;
use App\Models\MarketplaceStockSyncLog;
use App\Models\Setting;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class TrendyolStockSyncService
{
    public function sync(MarketplaceCredential $credential): MarketplaceStockSyncLog
    {
        $startedAt = Carbon::now();
        $apiService = new TrendyolApiService($credential);
        $formatter = new TrendyolProductFormatter();

        $log = MarketplaceStockSyncLog::create([
            'marketplace' => 'trendyol',
            'credential_id' => $credential->id,
            'started_at' => $startedAt,
        ]);

        $batchRequestIds = [];
        $errorLog = [];
        $totalProducts = 0;
        $stockChanged = 0;
        $apiCalls = 0;
        $failed = 0;

        try {
            // 1. Get marketplace products that are approved or on_sale
            $mpProducts = MarketplaceProduct::where('marketplace', 'trendyol')
                ->whereIn('status', ['approved', 'on_sale'])
                ->with(['product.variants' => fn ($q) => $q->where('is_active', true)])
                ->get();

            $totalProducts = $mpProducts->count();

            if ($totalProducts === 0) {
                return $this->finishLog($log, $startedAt, $totalProducts, $stockChanged, $apiCalls, $failed, $batchRequestIds, $errorLog);
            }

            // 2. Build items and filter only stock-changed ones
            $minStock = (int) Setting::get('trendyol.min_stock', 0);
            $changedItems = [];

            foreach ($mpProducts as $mpProduct) {
                $product = $mpProduct->product;

                if (!$product) {
                    continue;
                }

                $items = $formatter->formatPriceStockItems($product);
                $listingData = $mpProduct->listing_data ?? [];

                foreach ($items as $item) {
                    $barcode = $item['barcode'];
                    $currentStock = $item['quantity'];

                    // Kritik stok kontrolü: eşik altındaysa Trendyol'a 0 gönder
                    if ($minStock > 0 && $currentStock <= $minStock) {
                        $currentStock = 0;
                        $item['quantity'] = 0;
                    }

                    $lastKnownStock = $listingData['last_known_stock'][$barcode] ?? null;

                    // Only send if stock has changed or first sync
                    if ($lastKnownStock === null || (int) $lastKnownStock !== (int) $currentStock) {
                        $changedItems[] = [
                            'item' => $item,
                            'mpProduct' => $mpProduct,
                            'barcode' => $barcode,
                            'newStock' => $currentStock,
                        ];
                        $stockChanged++;
                    }
                }
            }

            if (empty($changedItems)) {
                return $this->finishLog($log, $startedAt, $totalProducts, $stockChanged, $apiCalls, $failed, $batchRequestIds, $errorLog);
            }

            // 3. Chunk into batches of 1000 and send
            $chunks = array_chunk($changedItems, 1000);

            foreach ($chunks as $chunk) {
                $payload = array_map(fn ($c) => $c['item'], $chunk);

                try {
                    $result = $apiService->updatePriceAndStock($payload);
                    $apiCalls++;

                    if (!empty($result['batchRequestId'])) {
                        $batchRequestIds[] = $result['batchRequestId'];
                    }

                    // 4. Update last_known_stock for successful items
                    $grouped = [];
                    foreach ($chunk as $c) {
                        $mpId = $c['mpProduct']->id;
                        $grouped[$mpId][] = $c;
                    }

                    foreach ($grouped as $mpId => $entries) {
                        $mpProduct = $entries[0]['mpProduct'];
                        $listingData = $mpProduct->listing_data ?? [];
                        $lastKnownStock = $listingData['last_known_stock'] ?? [];

                        foreach ($entries as $entry) {
                            $lastKnownStock[$entry['barcode']] = (int) $entry['newStock'];
                        }

                        $listingData['last_known_stock'] = $lastKnownStock;
                        $mpProduct->listing_data = $listingData;
                        $mpProduct->save();
                    }
                } catch (\Throwable $e) {
                    $failed += count($chunk);
                    $apiCalls++;
                    $errorLog[] = [
                        'message' => $e->getMessage(),
                        'chunk_size' => count($chunk),
                        'time' => now()->toISOString(),
                    ];

                    Log::error('TrendyolStockSync API error', [
                        'credential_id' => $credential->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        } catch (\Throwable $e) {
            $errorLog[] = [
                'message' => $e->getMessage(),
                'time' => now()->toISOString(),
            ];

            Log::error('TrendyolStockSync fatal error', [
                'credential_id' => $credential->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $this->finishLog($log, $startedAt, $totalProducts, $stockChanged, $apiCalls, $failed, $batchRequestIds, $errorLog);
    }

    private function finishLog(
        MarketplaceStockSyncLog $log,
        Carbon $startedAt,
        int $totalProducts,
        int $stockChanged,
        int $apiCalls,
        int $failed,
        array $batchRequestIds,
        array $errorLog,
    ): MarketplaceStockSyncLog {
        $completedAt = Carbon::now();

        $log->update([
            'total_products' => $totalProducts,
            'stock_changed' => $stockChanged,
            'api_calls' => $apiCalls,
            'failed' => $failed,
            'batch_request_ids' => $batchRequestIds ?: null,
            'error_log' => $errorLog ?: null,
            'duration_seconds' => $startedAt->diffInSeconds($completedAt),
            'completed_at' => $completedAt,
        ]);

        return $log->fresh();
    }
}
