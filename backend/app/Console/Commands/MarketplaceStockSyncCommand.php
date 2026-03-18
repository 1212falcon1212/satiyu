<?php

namespace App\Console\Commands;

use App\Jobs\Marketplace\HepsiburadaStockSyncJob;
use App\Jobs\Marketplace\TrendyolStockSyncJob;
use App\Models\MarketplaceCredential;
use App\Services\Marketplace\HepsiburadaStockSyncService;
use App\Services\Marketplace\TrendyolStockSyncService;
use Illuminate\Console\Command;

class MarketplaceStockSyncCommand extends Command
{
    protected $signature = 'marketplace:stock-sync {--marketplace= : trendyol veya hepsiburada}';

    protected $description = 'Lokal DB stok verilerini marketplace API\'lerine senkronize eder';

    public function handle(): int
    {
        $marketplace = $this->option('marketplace');

        if ($marketplace && !in_array($marketplace, ['trendyol', 'hepsiburada'])) {
            $this->error("Geçersiz marketplace: {$marketplace}. Geçerli: trendyol, hepsiburada");

            return self::FAILURE;
        }

        $marketplaces = $marketplace ? [$marketplace] : ['trendyol', 'hepsiburada'];

        foreach ($marketplaces as $mp) {
            $this->syncMarketplace($mp);
        }

        return self::SUCCESS;
    }

    private function syncMarketplace(string $marketplace): void
    {
        $credentials = MarketplaceCredential::where('marketplace', $marketplace)
            ->where('is_active', true)
            ->get();

        if ($credentials->isEmpty()) {
            $this->warn("[{$marketplace}] Aktif credential bulunamadı, atlanıyor.");

            return;
        }

        foreach ($credentials as $credential) {
            $this->info("[{$marketplace}] Stok sync başlatılıyor (credential #{$credential->id})...");

            if ($this->option('marketplace')) {
                // Specific marketplace — run synchronously for direct feedback
                $service = match ($marketplace) {
                    'trendyol' => app(TrendyolStockSyncService::class),
                    'hepsiburada' => app(HepsiburadaStockSyncService::class),
                };
                $log = $service->sync($credential);
                $this->printLog($log);
            } else {
                // All marketplaces — dispatch async
                match ($marketplace) {
                    'trendyol' => TrendyolStockSyncJob::dispatch($credential->id),
                    'hepsiburada' => HepsiburadaStockSyncJob::dispatch($credential->id),
                };
                $this->info("[{$marketplace}] Job dispatch edildi.");
            }
        }
    }

    private function printLog($log): void
    {
        $this->table(
            ['Metrik', 'Değer'],
            [
                ['Toplam Ürün', $log->total_products],
                ['Stok Değişen', $log->stock_changed],
                ['API Çağrısı', $log->api_calls],
                ['Başarısız', $log->failed],
                ['Süre (sn)', $log->duration_seconds],
            ]
        );

        if (!empty($log->error_log)) {
            $this->warn('Hatalar:');
            foreach ($log->error_log as $err) {
                $this->error("  - {$err['message']}");
            }
        }
    }
}
