<?php

namespace App\Console\Commands;

use App\Models\MarketplaceCategory;
use App\Models\MarketplaceCredential;
use App\Services\Marketplace\HepsiburadaApiService;
use Illuminate\Console\Command;

class HepsiburadaSyncAttributesCommand extends Command
{
    protected $signature = 'hepsiburada:sync-attributes
        {--limit=0 : Maksimum kategori sayısı (0 = hepsi)}
        {--force : Daha önce çekilmiş kategorileri de güncelle}
        {--sleep=50 : İstekler arası bekleme süresi (ms)}';

    protected $description = 'Hepsiburada yaprak kategorilerinin özelliklerini API\'den çeker';

    public function handle(): int
    {
        $credential = MarketplaceCredential::where('marketplace', 'hepsiburada')
            ->where('is_active', true)
            ->first();

        if (!$credential) {
            $this->error('Hepsiburada için aktif API kimlik bilgisi bulunamadı.');
            return self::FAILURE;
        }

        $service = new HepsiburadaApiService($credential);

        // Yaprak kategorileri bul (çocuğu olmayan kategoriler)
        $query = MarketplaceCategory::where('marketplace', 'hepsiburada')
            ->whereNotIn('marketplace_category_id', function ($q) {
                $q->select('parent_id')
                    ->from('marketplace_categories')
                    ->where('marketplace', 'hepsiburada')
                    ->whereNotNull('parent_id');
            });

        if (!$this->option('force')) {
            $query->whereNull('attributes');
        }

        $limit = (int) $this->option('limit');
        if ($limit > 0) {
            $query->limit($limit);
        }

        $categories = $query->get();
        $total = $categories->count();

        if ($total === 0) {
            $this->info('Özellik çekilecek kategori bulunamadı. (--force ile mevcut olanları da güncelleyebilirsiniz)');
            return self::SUCCESS;
        }

        $sleepMs = max(10, (int) $this->option('sleep'));

        $this->info("Toplam {$total} yaprak kategori için özellikler çekilecek...");
        $this->info("İstek arası bekleme: {$sleepMs}ms");

        $bar = $this->output->createProgressBar($total);
        $bar->setFormat(' %current%/%max% [%bar%] %percent:3s%% -- Başarılı: %message%');
        $bar->setMessage('0');
        $bar->start();

        $startTime = microtime(true);
        $success = 0;
        $skipped = 0;
        $errors = 0;
        $maxRetries = 3;

        foreach ($categories as $index => $category) {
            $categoryId = (int) $category->marketplace_category_id;
            $retries = 0;
            $fetched = false;

            while ($retries < $maxRetries && !$fetched) {
                try {
                    $result = $service->getCategoryAttributes($categoryId);

                    if (($result['success'] ?? false) === false
                        && empty($result['baseAttributes'])
                        && empty($result['attributes'])
                        && empty($result['variantAttributes'])) {
                        $skipped++;
                        $fetched = true;
                        break;
                    }

                    $category->update([
                        'attributes' => [
                            'baseAttributes' => $result['baseAttributes'] ?? [],
                            'attributes' => $result['attributes'] ?? [],
                            'variantAttributes' => $result['variantAttributes'] ?? [],
                        ],
                    ]);

                    $success++;
                    $fetched = true;
                } catch (\Exception $e) {
                    $retries++;

                    if ($retries >= $maxRetries) {
                        $errors++;
                        $this->newLine();
                        $this->warn("Kategori {$categoryId} ({$category->category_name}) atlanıyor: " . $e->getMessage());
                        break;
                    }

                    sleep(pow(2, $retries));
                }
            }

            $bar->setMessage((string) $success);
            $bar->advance();

            // Her 5 kategoride bellek temizliği
            if (($index + 1) % 5 === 0) {
                gc_collect_cycles();
            }

            if ($fetched && $index < $total - 1) {
                usleep($sleepMs * 1000);
            }
        }

        $bar->finish();
        $this->newLine(2);

        $elapsed = round(microtime(true) - $startTime, 2);

        $this->info('--- Sonuç ---');
        $this->info("Başarılı: {$success}");

        if ($skipped > 0) {
            $this->info("Özelliği olmayan (non-leaf/unavailable): {$skipped}");
        }

        if ($errors > 0) {
            $this->warn("Başarısız: {$errors}");
        }

        $this->info("Sure: {$elapsed}s");

        return $errors > 0 ? self::FAILURE : self::SUCCESS;
    }
}
