<?php

namespace App\Console\Commands;

use App\Models\MarketplaceCredential;
use App\Services\Marketplace\HepsiburadaApiService;
use App\Services\Marketplace\TrendyolApiService;
use Illuminate\Console\Command;

class MarketplaceSyncCategoriesCommand extends Command
{
    protected $signature = 'marketplace:sync-categories {marketplace : trendyol veya hepsiburada}';
    protected $description = 'Pazaryeri kategorilerini API\'den çekip veritabanına kaydet';

    public function handle(): int
    {
        $marketplace = $this->argument('marketplace');

        if (!in_array($marketplace, ['trendyol', 'hepsiburada'])) {
            $this->error('Geçersiz marketplace. Kullanım: trendyol veya hepsiburada');
            return self::FAILURE;
        }

        $credential = MarketplaceCredential::where('marketplace', $marketplace)
            ->where('is_active', true)
            ->first();

        if (!$credential) {
            $this->error("{$marketplace} için aktif API kimlik bilgisi bulunamadı.");
            return self::FAILURE;
        }

        $service = match ($marketplace) {
            'trendyol' => new TrendyolApiService($credential),
            'hepsiburada' => new HepsiburadaApiService($credential),
        };

        $this->info("{$marketplace} kategorileri çekiliyor...");

        try {
            $count = $service->syncCategories();
            $this->info("Tamamlandı! {$count} kategori senkronize edildi.");
            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Hata: ' . $e->getMessage());
            return self::FAILURE;
        }
    }
}
