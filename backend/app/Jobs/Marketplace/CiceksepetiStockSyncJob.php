<?php

namespace App\Jobs\Marketplace;

use App\Models\MarketplaceCredential;
use App\Services\Marketplace\CiceksepetiStockSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class CiceksepetiStockSyncJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;
    public int $tries = 2;

    public function __construct(
        public int $credentialId,
    ) {}

    public function handle(CiceksepetiStockSyncService $service): void
    {
        $credential = MarketplaceCredential::findOrFail($this->credentialId);

        $service->sync($credential);
    }
}
