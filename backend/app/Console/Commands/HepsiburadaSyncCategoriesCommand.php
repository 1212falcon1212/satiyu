<?php

namespace App\Console\Commands;

use App\Models\MarketplaceCredential;
use App\Services\Marketplace\HepsiburadaApiService;
use Illuminate\Console\Command;

class HepsiburadaSyncCategoriesCommand extends Command
{
    protected $signature = 'hepsiburada:sync-categories {--size=1000 : Sayfa başına kategori sayısı (max 2000)}';
    protected $description = 'Hepsiburada kategorilerini API\'den çekip veritabanına kaydeder (robust, sayfa bazlı)';

    public function handle(): int
    {
        $size = min((int) $this->option('size'), 2000);
        if ($size < 1) {
            $size = 1000;
        }

        $credential = MarketplaceCredential::where('marketplace', 'hepsiburada')
            ->where('is_active', true)
            ->first();

        if (!$credential) {
            $this->error('Hepsiburada için aktif API kimlik bilgisi bulunamadı.');
            return self::FAILURE;
        }

        $service = new HepsiburadaApiService($credential);

        $this->info('Hepsiburada kategori senkronizasyonu başlıyor...');
        $this->info("Sayfa boyutu: {$size}");

        $startTime = microtime(true);
        $page = 0;
        $totalSynced = 0;
        $totalErrors = 0;
        $totalPages = null;

        // İlk sayfayı çekerek toplam sayfa sayısını öğrenelim
        try {
            $firstResult = $service->fetchCategoriesPage(0, $size);
            $totalPages = $firstResult['totalPages'] ?: 1;
            $totalElements = $firstResult['totalElements'];

            $this->info("Toplam kategori: ~{$totalElements}, Toplam sayfa: {$totalPages}");
        } catch (\Exception $e) {
            $this->error('İlk sayfa alınamadı: ' . $e->getMessage());
            return self::FAILURE;
        }

        $bar = $this->output->createProgressBar($totalPages);
        $bar->setFormat(' %current%/%max% [%bar%] %percent:3s%% -- Sayfa: %current%, Senk: %message%');
        $bar->setMessage('0');
        $bar->start();

        // İlk sayfanın verilerini işleyelim
        if (!empty($firstResult['categories'])) {
            $synced = $service->upsertCategories($firstResult['categories']);
            $totalSynced += $synced;
            $bar->setMessage((string) $totalSynced);
        }
        $bar->advance();
        $page = 1;

        $isLast = $firstResult['last'];

        while (!$isLast && $page < $totalPages) {
            $retries = 0;
            $maxRetries = 3;
            $success = false;

            while ($retries < $maxRetries && !$success) {
                try {
                    $result = $service->fetchCategoriesPage($page, $size);
                    $categories = $result['categories'];

                    if (!empty($categories)) {
                        $synced = $service->upsertCategories($categories);
                        $totalSynced += $synced;
                        $bar->setMessage((string) $totalSynced);
                    }

                    $isLast = $result['last'];
                    $success = true;
                } catch (\Exception $e) {
                    $retries++;

                    if ($retries >= $maxRetries) {
                        $totalErrors++;
                        $this->newLine();
                        $this->warn("Sayfa {$page} atlanıyor ({$maxRetries} deneme başarısız): " . $e->getMessage());
                        break;
                    }

                    $waitTime = pow(2, $retries);
                    sleep($waitTime);
                }
            }

            $bar->advance();
            $page++;

            // Her 5 sayfada bellek temizliği
            if ($page % 5 === 0) {
                gc_collect_cycles();
            }
        }

        $bar->finish();
        $this->newLine(2);

        $elapsed = round(microtime(true) - $startTime, 2);

        $this->info("--- Sonuç ---");
        $this->info("Toplam senk edilen: {$totalSynced}");
        $this->info("Toplam sayfa: {$page}");

        if ($totalErrors > 0) {
            $this->warn("Başarısız sayfalar: {$totalErrors}");
        }

        $this->info("Sure: {$elapsed}s");

        return $totalErrors > 0 ? self::FAILURE : self::SUCCESS;
    }
}
