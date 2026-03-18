<?php

namespace App\Console\Commands;

use App\Models\MarketplaceCredential;
use App\Services\Marketplace\TrendyolApiService;
use Illuminate\Console\Command;

class MarketplaceSyncCargoCommand extends Command
{
    protected $signature = 'marketplace:sync-cargo';
    protected $description = 'Trendyol kargo şirketlerini API\'den çekip veritabanına kaydet';

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

        $this->info('Trendyol kargo şirketleri çekiliyor...');

        try {
            $count = $service->syncCargoCompanies();
            $this->info("Tamamlandı! {$count} kargo şirketi senkronize edildi.");
            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Hata: ' . $e->getMessage());
            return self::FAILURE;
        }
    }
}
