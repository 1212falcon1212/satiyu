<?php

namespace App\Console\Commands;

use App\Models\MarketplaceCredential;
use App\Services\Marketplace\TrendyolProductImportService;
use Illuminate\Console\Command;

class TrendyolImportProductsCommand extends Command
{
    protected $signature = 'trendyol:import-products';

    protected $description = 'Trendyol ürünlerini barcode/SKU ile lokal ürünlerle eşleştirip marketplace_products tablosuna kaydeder';

    public function handle(): int
    {
        $credential = MarketplaceCredential::where('marketplace', 'trendyol')
            ->where('is_active', true)
            ->first();

        if (!$credential) {
            $this->error('Aktif Trendyol credential bulunamadı.');

            return self::FAILURE;
        }

        $this->info('Trendyol ürünleri çekiliyor ve eşleştiriliyor...');

        $service = new TrendyolProductImportService();
        $stats = $service->import($credential);

        $this->newLine();
        $this->table(
            ['Metrik', 'Değer'],
            [
                ['Trendyol Toplam Ürün', $stats['total_trendyol']],
                ['Eşleşen', $stats['matched']],
                ['Eşleşmeyen', $stats['unmatched']],
                ['Yeni Eklenen', $stats['created']],
                ['Güncellenen', $stats['updated']],
            ]
        );

        if (!empty($stats['unmatched_items'])) {
            $this->newLine();
            $this->warn('Eşleşmeyen ürünler:');
            $this->table(
                ['productMainId', 'Başlık', 'Barkod', 'Stok Kodu'],
                array_map(fn ($item) => [
                    $item['productMainId'],
                    mb_substr($item['title'], 0, 50),
                    $item['barcode'],
                    $item['stockCode'],
                ], array_slice($stats['unmatched_items'], 0, 20))
            );

            if (count($stats['unmatched_items']) > 20) {
                $this->info('... ve ' . (count($stats['unmatched_items']) - 20) . ' ürün daha');
            }
        }

        if (!empty($stats['errors'])) {
            $this->newLine();
            $this->error('Hatalar:');
            foreach ($stats['errors'] as $err) {
                $this->line("  [{$err['productMainId']}] {$err['message']}");
            }
        }

        return self::SUCCESS;
    }
}
