<?php

namespace App\Console\Commands;

use App\Models\MarketplaceCredential;
use App\Services\Marketplace\TrendyolApiService;
use Illuminate\Console\Command;

class MarketplaceSyncBrandsCommand extends Command
{
    protected $signature = 'marketplace:sync-brands';
    protected $description = 'Trendyol markalarını API\'den çekip veritabanına kaydet';

    public function handle(): int
    {
        $credential = MarketplaceCredential::where('marketplace', 'trendyol')
            ->where('is_active', true)
            ->first();

        if (!$credential) {
            $this->error('Trendyol için aktif API kimlik bilgisi bulunamadı.');
            return self::FAILURE;
        }

        $service = new TrendyolApiService($credential);

        $this->info('Trendyol markaları çekiliyor...');

        try {
            $count = $service->syncBrands();
            $this->info("Tamamlandı! {$count} marka senkronize edildi.");
            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Hata: ' . $e->getMessage());
            return self::FAILURE;
        }
    }
}
