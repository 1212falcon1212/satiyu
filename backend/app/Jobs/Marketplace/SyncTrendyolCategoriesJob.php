<?php

namespace App\Jobs\Marketplace;

use App\Models\MarketplaceCredential;
use App\Services\Marketplace\TrendyolApiService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class SyncTrendyolCategoriesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;
    public int $tries = 2;

    public function __construct(
        public readonly int $credentialId,
    ) {}

    public function handle(): void
    {
        $credential = MarketplaceCredential::findOrFail($this->credentialId);
        $service = new TrendyolApiService($credential);

        Log::info('Trendyol kategori senk başladı', ['credential_id' => $this->credentialId]);

        $count = $service->syncCategories();

        Cache::forget('trendyol_leaf_categories_with_paths');

        Log::info('Trendyol kategori senk tamamlandı', ['count' => $count]);
    }

    public function failed(?\Throwable $exception): void
    {
        Log::error('Trendyol kategori senk başarısız', [
            'credential_id' => $this->credentialId,
            'error' => $exception?->getMessage(),
        ]);
    }
}
