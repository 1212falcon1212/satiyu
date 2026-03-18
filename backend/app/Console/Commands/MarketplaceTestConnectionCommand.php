<?php

namespace App\Console\Commands;

use App\Models\MarketplaceCredential;
use App\Services\Marketplace\HepsiburadaApiService;
use App\Services\Marketplace\TrendyolApiService;
use Illuminate\Console\Command;

class MarketplaceTestConnectionCommand extends Command
{
    protected $signature = 'marketplace:test-connection {marketplace : trendyol veya hepsiburada}';
    protected $description = 'Pazaryeri API bağlantısını test et';

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

        $this->info("{$marketplace} API bağlantısı test ediliyor...");

        $success = $service->testConnection();

        if ($success) {
            $this->info('Bağlantı başarılı!');
            return self::SUCCESS;
        }

        $this->error('Bağlantı başarısız. API kimlik bilgilerini kontrol edin.');
        return self::FAILURE;
    }
}
