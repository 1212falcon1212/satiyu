<?php

namespace App\Console\Commands;

use App\Models\MarketplaceCredential;
use App\Services\Marketplace\TrendyolApiService;
use Illuminate\Console\Command;

class TrendyolSyncCommand extends Command
{
    protected $signature = 'trendyol:sync {type : categories, brands, cargo, category-attributes} {--force : Mevcut verileri de güncelle}';

    protected $description = 'Trendyol verilerini senk et (categories, brands, cargo, category-attributes)';

    public function handle(): int
    {
        $type = $this->argument('type');

        $credential = MarketplaceCredential::where('marketplace', 'trendyol')
            ->where('is_active', true)
            ->first();

        if (!$credential) {
            $this->error('Trendyol credential bulunamadı. Önce API bilgilerini kaydedin.');
            return self::FAILURE;
        }

        $service = new TrendyolApiService($credential);

        return match ($type) {
            'categories' => $this->syncCategories($service),
            'brands' => $this->syncBrands($service),
            'cargo' => $this->syncCargo($service),
            'category-attributes' => $this->syncCategoryAttributes($service),
            default => $this->invalidType($type),
        };
    }

    private function syncCategories(TrendyolApiService $service): int
    {
        $this->info('Kategoriler çekiliyor...');
        $count = $service->syncCategories();
        $this->info("Toplam {$count} kategori senk edildi.");
        return self::SUCCESS;
    }

    private function syncBrands(TrendyolApiService $service): int
    {
        $this->info('Markalar çekiliyor (bu işlem uzun sürebilir)...');
        $count = $service->syncBrands();
        $this->info("Toplam {$count} marka senk edildi.");
        return self::SUCCESS;
    }

    private function syncCargo(TrendyolApiService $service): int
    {
        $this->info('Kargo şirketleri çekiliyor...');
        $count = $service->syncCargoCompanies();
        $this->info("Toplam {$count} kargo şirketi senk edildi.");
        return self::SUCCESS;
    }

    private function syncCategoryAttributes(TrendyolApiService $service): int
    {
        $forceAll = $this->option('force');

        if ($forceAll) {
            $this->warn('Force modu: Tüm yaprak kategorilerin özellikleri yeniden çekilecek.');
        } else {
            $this->info('Sadece henüz özellikleri çekilmemiş kategoriler işlenecek.');
        }

        $this->info('Kategori özellikleri çekiliyor (bu işlem uzun sürebilir)...');
        $this->newLine();

        $startTime = now();
        $lastFailed = [];

        $result = $service->syncCategoryAttributes(
            onProgress: function (int $current, int $total, string $name, bool $success) use (&$lastFailed) {
                $percent = $total > 0 ? round(($current / $total) * 100) : 0;
                $status = $success ? '<fg=green>OK</>' : '<fg=red>HATA</>';

                $this->output->write(
                    "\r  [{$percent}%] {$current}/{$total} — {$status} {$name}" . str_repeat(' ', 20)
                );

                if (!$success) {
                    $lastFailed[] = $name;
                }
            },
            forceAll: $forceAll,
        );

        $this->newLine(2);

        $elapsed = $startTime->diffInSeconds(now());
        $minutes = intdiv($elapsed, 60);
        $seconds = $elapsed % 60;

        $this->info("Tamamlandı! Süre: {$minutes}dk {$seconds}s");
        $this->info("Başarılı: {$result['synced']} | Başarısız: {$result['failed']} | Toplam: {$result['total']}");

        if (!empty($lastFailed)) {
            $this->newLine();
            $this->warn('Başarısız kategoriler (' . count($lastFailed) . '):');
            foreach (array_slice($lastFailed, 0, 20) as $name) {
                $this->line("  - {$name}");
            }
            if (count($lastFailed) > 20) {
                $this->line('  ... ve ' . (count($lastFailed) - 20) . ' daha (detay için laravel.log)');
            }
        }

        return $result['failed'] > 0 && $result['synced'] === 0 ? self::FAILURE : self::SUCCESS;
    }

    private function invalidType(string $type): int
    {
        $this->error("Geçersiz tip: {$type}. Kullanım: categories, brands, cargo, category-attributes");
        return self::FAILURE;
    }
}
