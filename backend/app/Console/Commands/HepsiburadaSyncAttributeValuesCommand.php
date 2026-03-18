<?php

namespace App\Console\Commands;

use App\Models\MarketplaceCategory;
use App\Models\MarketplaceCredential;
use App\Services\Marketplace\HepsiburadaApiService;
use Illuminate\Console\Command;

class HepsiburadaSyncAttributeValuesCommand extends Command
{
    protected $signature = 'hepsiburada:sync-attribute-values
        {--limit=0 : Maksimum kategori sayısı (0 = hepsi)}
        {--force : Daha önce çekilmiş değerleri de güncelle}
        {--sleep=30 : İstekler arası bekleme süresi (ms)}';

    protected $description = 'Hepsiburada enum tipi özelliklerin değerlerini API\'den çeker (kategori bazlı, memory-safe)';

    private int $maxRetries = 3;

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
        $force = $this->option('force');
        $limit = (int) $this->option('limit');
        $sleepMs = max(10, (int) $this->option('sleep'));

        // Toplam kategori sayısını hesapla (progress bar için)
        $totalCategories = MarketplaceCategory::where('marketplace', 'hepsiburada')
            ->whereNotNull('attributes')
            ->count();

        if ($totalCategories === 0) {
            $this->error('Özellikleri çekilmiş kategori bulunamadı. Önce hepsiburada:sync-attributes çalıştırın.');
            return self::FAILURE;
        }

        if ($limit > 0) {
            $totalCategories = min($totalCategories, $limit);
        }

        $this->info("Toplam {$totalCategories} kategori taranacak (enum özellik değerleri çekilecek)");
        $this->info("İstek arası bekleme: {$sleepMs}ms | Force: " . ($force ? 'evet' : 'hayır'));

        $bar = $this->output->createProgressBar($totalCategories);
        $bar->setFormat(" %current%/%max% [%bar%] %percent:3s%% -- Kat: %current%, Özellik: %message%");
        $bar->setMessage('0/0');
        $bar->start();

        $startTime = microtime(true);
        $totalAttrs = 0;
        $totalErrors = 0;
        $categoriesProcessed = 0;
        $categoriesSkipped = 0;

        // Raw query ile sadece ID cek — ORDER BY ve Eloquent scope yok, sort memory sorunu yok
        $sql = 'SELECT id FROM marketplace_categories WHERE marketplace = ? AND attributes IS NOT NULL';
        $bindings = ['hepsiburada'];

        if ($limit > 0) {
            $sql .= ' LIMIT ?';
            $bindings[] = $limit;
        }

        $categoryIds = collect(\Illuminate\Support\Facades\DB::select($sql, $bindings))->pluck('id')->all();

        foreach ($categoryIds as $catDbId) {
            // Her kategoriyi tek tek yükle — memory'de sadece 1 tane
            $category = MarketplaceCategory::select(['id', 'marketplace_category_id', 'category_name', 'attributes'])
                ->find($catDbId);

            if (!$category) {
                $bar->advance();
                continue;
            }

            $attrs = $category->attributes;
            $enumAttrs = $this->collectEnumAttributes($attrs, $force);

            if (empty($enumAttrs)) {
                $categoriesSkipped++;
                $bar->advance();
                continue;
            }

            $categoryId = (int) $category->marketplace_category_id;
            $catSuccess = 0;
            $catErrors = 0;

            foreach ($enumAttrs as $enumAttr) {
                $values = $this->fetchWithRetry($service, $categoryId, $enumAttr['id']);

                if ($values !== null) {
                    $this->injectValues($attrs, 'baseAttributes', $enumAttr['id'], $values);
                    $this->injectValues($attrs, 'attributes', $enumAttr['id'], $values);
                    $this->injectValues($attrs, 'variantAttributes', $enumAttr['id'], $values);
                    $catSuccess++;
                } else {
                    $catErrors++;
                }

                usleep($sleepMs * 1000);
            }

            // Her kategoriyi hemen kaydet ve memory'den çıkar
            if ($catSuccess > 0) {
                $category->attributes = $attrs;
                $category->save();
            }

            $totalAttrs += $catSuccess;
            $totalErrors += $catErrors;
            $categoriesProcessed++;

            $bar->setMessage("{$totalAttrs}/{$totalErrors}err");
            $bar->advance();

            // Memory'den at
            unset($category, $attrs, $enumAttrs);

            // Her 20 kategoride bellek temizliği
            if ($categoriesProcessed % 20 === 0) {
                gc_collect_cycles();
            }
        }

        unset($categoryIds);

        $bar->finish();
        $this->newLine(2);

        $elapsed = round(microtime(true) - $startTime, 2);
        $this->info('--- Sonuç ---');
        $this->info("İşlenen kategori: {$categoriesProcessed}");
        $this->info("Atlanan kategori (zaten çekilmiş): {$categoriesSkipped}");
        $this->info("Başarılı özellik değeri: {$totalAttrs}");

        if ($totalErrors > 0) {
            $this->warn("Başarısız: {$totalErrors}");
        }

        $this->info("Sure: {$elapsed}s");

        return $totalErrors > 0 && $totalAttrs === 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * Bir kategorinin attribute'larından enum tipli olanları toplar.
     */
    private function collectEnumAttributes(array $attrs, bool $force): array
    {
        $enums = [];
        $seen = [];

        foreach (['baseAttributes', 'attributes', 'variantAttributes'] as $group) {
            foreach ($attrs[$group] ?? [] as $attr) {
                if (($attr['type'] ?? '') !== 'enum') {
                    continue;
                }

                $attrId = $attr['id'] ?? '';
                if (!$attrId || isset($seen[$attrId])) {
                    continue;
                }

                // --force değilse ve values varsa atla
                if (!$force && !empty($attr['values'])) {
                    continue;
                }

                $seen[$attrId] = true;
                $enums[] = ['id' => $attrId, 'name' => $attr['name'] ?? ''];
            }
        }

        return $enums;
    }

    /**
     * Retry ile özellik değerlerini çeker.
     */
    private function fetchWithRetry(HepsiburadaApiService $service, int $categoryId, string $attributeId): ?array
    {
        for ($attempt = 1; $attempt <= $this->maxRetries; $attempt++) {
            try {
                $result = $service->getAttributeValues($categoryId, $attributeId);
                return $result['values'] ?? [];
            } catch (\Exception $e) {
                if ($attempt >= $this->maxRetries) {
                    $this->newLine();
                    $this->warn("  Kat:{$categoryId} Attr:{$attributeId} başarısız: " . mb_substr($e->getMessage(), 0, 100));
                    return null;
                }
                sleep(pow(2, $attempt));
            }
        }

        return null;
    }

    /**
     * Attribute grubundaki enum'a values ekler.
     */
    private function injectValues(array &$attrs, string $group, string $attributeId, array $values): void
    {
        if (!isset($attrs[$group]) || !is_array($attrs[$group])) {
            return;
        }

        foreach ($attrs[$group] as &$attr) {
            if (($attr['id'] ?? '') === $attributeId) {
                $attr['values'] = $values;
                break;
            }
        }
    }
}
