<?php

namespace App\Services\Marketplace;

use App\Models\MarketplaceCredential;
use App\Models\MarketplaceProduct;
use App\Models\MarketplaceStockSyncLog;
use App\Models\Setting;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class CiceksepetiStockSyncService
{
    public function sync(MarketplaceCredential $credential): MarketplaceStockSyncLog
    {
        $startedAt = Carbon::now();
        $apiService = new CiceksepetiApiService($credential);
        $formatter = new CiceksepetiProductFormatter();

        $log = MarketplaceStockSyncLog::create([
            'marketplace' => 'ciceksepeti',
            'credential_id' => $credential->id,
            'started_at' => $startedAt,
        ]);

        $batchIds = [];
        $errorLog = [];
        $totalProducts = 0;
        $stockChanged = 0;
        $apiCalls = 0;
        $failed = 0;

        try {
            $mpProducts = MarketplaceProduct::where('marketplace', 'ciceksepeti')
                ->whereIn('status', ['approved', 'on_sale'])
                ->with(['product.variants' => fn($q) => $q->where('is_active', true)])
                ->get();

            $totalProducts = $mpProducts->count();

            if ($totalProducts === 0) {
                return $this->finishLog($log, $startedAt, $totalProducts, $stockChanged, $apiCalls, $failed, $batchIds, $errorLog);
            }

            $minStock = (int) Setting::get('ciceksepeti.min_stock', 0);
            $changedItems = [];

            foreach ($mpProducts as $mpProduct) {
                $product = $mpProduct->product;

                if (!$product) {
                    continue;
                }

                $items = $formatter->formatPriceStockItems($product);
                $listingData = $mpProduct->listing_data ?? [];

                foreach ($items as $item) {
                    $stockCode = $item['stockCode'];
                    $currentStock = $item['stockQuantity'];

                    if ($minStock > 0 && $currentStock <= $minStock) {
                        $currentStock = 0;
                        $item['stockQuantity'] = 0;
                    }

                    $lastKnownStock = $listingData['last_known_stock'][$stockCode] ?? null;

                    if ($lastKnownStock === null || (int) $lastKnownStock !== (int) $currentStock) {
                        $changedItems[] = [
                            'item' => $item,
                            'mpProduct' => $mpProduct,
                            'stockCode' => $stockCode,
                            'newStock' => $currentStock,
                        ];
                        $stockChanged++;
                    }
                }
            }

            if (empty($changedItems)) {
                return $this->finishLog($log, $startedAt, $totalProducts, $stockChanged, $apiCalls, $failed, $batchIds, $errorLog);
            }

            // Çiçeksepeti max 200 item per request
            $chunks = array_chunk($changedItems, 200);

            foreach ($chunks as $chunk) {
                $payload = array_map(fn($c) => $c['item'], $chunk);

                try {
                    $result = $apiService->updatePriceAndStock($payload);
                    $apiCalls++;

                    if (!empty($result['batchId'])) {
                        $batchIds[] = $result['batchId'];
                    }

                    // Update last_known_stock
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
                            $lastKnownStock[$entry['stockCode']] = (int) $entry['newStock'];
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

                    Log::error('CiceksepetiStockSync API error', [
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

            Log::error('CiceksepetiStockSync fatal error', [
                'credential_id' => $credential->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $this->finishLog($log, $startedAt, $totalProducts, $stockChanged, $apiCalls, $failed, $batchIds, $errorLog);
    }

    private function finishLog(
        MarketplaceStockSyncLog $log,
        Carbon $startedAt,
        int $totalProducts,
        int $stockChanged,
        int $apiCalls,
        int $failed,
        array $batchIds,
        array $errorLog,
    ): MarketplaceStockSyncLog {
        $completedAt = Carbon::now();

        $log->update([
            'total_products' => $totalProducts,
            'stock_changed' => $stockChanged,
            'api_calls' => $apiCalls,
            'failed' => $failed,
            'batch_request_ids' => $batchIds ?: null,
            'error_log' => $errorLog ?: null,
            'duration_seconds' => $startedAt->diffInSeconds($completedAt),
            'completed_at' => $completedAt,
        ]);

        return $log->fresh();
    }
}
