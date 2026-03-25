<?php

namespace App\Jobs\Marketplace;

use App\Models\MarketplaceCredential;
use App\Services\Marketplace\CiceksepetiApiService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class SyncCiceksepetiCategoriesJob implements ShouldQueue
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
        $service = new CiceksepetiApiService($credential);

        Log::info('Çiçeksepeti kategori senk başladı', ['credential_id' => $this->credentialId]);

        $count = $service->syncCategories();

        Cache::forget('ciceksepeti_leaf_categories_with_paths');

        Log::info('Çiçeksepeti kategori senk tamamlandı', ['count' => $count]);
    }

    public function failed(?\Throwable $exception): void
    {
        Log::error('Çiçeksepeti kategori senk başarısız', [
            'credential_id' => $this->credentialId,
            'error' => $exception?->getMessage(),
        ]);
    }
}
