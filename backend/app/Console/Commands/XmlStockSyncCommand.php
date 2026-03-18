<?php

namespace App\Console\Commands;

use App\Jobs\XmlStockSyncJob;
use App\Models\XmlSource;
use App\Services\Xml\XmlStockSyncService;
use Illuminate\Console\Command;

class XmlStockSyncCommand extends Command
{
    protected $signature = 'xml:stock-sync {--source= : Belirli bir XML source ID}';
    protected $description = 'XML kaynaklarindan stok guncellemesi yapar';

    public function handle(XmlStockSyncService $service): int
    {
        $sourceId = $this->option('source');

        if ($sourceId) {
            $source = XmlSource::find($sourceId);
            if (!$source) {
                $this->error("XML source #{$sourceId} bulunamadi.");
                return self::FAILURE;
            }

            $this->info("Stok sync baslatiliyor: {$source->name} (ID: {$source->id})");
            $log = $service->sync($source);
            $this->printLog($log);

            return self::SUCCESS;
        }

        // Auto mod: aktif ve stock_sync_enabled olanlar
        $sources = XmlSource::where('is_active', true)
            ->where('stock_sync_enabled', true)
            ->get();

        if ($sources->isEmpty()) {
            $this->info('Stok sync icin aktif kaynak bulunamadi.');
            return self::SUCCESS;
        }

        foreach ($sources as $source) {
            $this->info("Job dispatch ediliyor: {$source->name} (ID: {$source->id})");
            XmlStockSyncJob::dispatch($source->id);
        }

        $this->info("{$sources->count()} kaynak icin stok sync job'lari dispatch edildi.");

        return self::SUCCESS;
    }

    protected function printLog($log): void
    {
        $this->table(
            ['Metrik', 'Deger'],
            [
                ['XML Urun Sayisi', $log->xml_product_count],
                ['Eslesen Urunler', $log->matched_products],
                ['Stok Degisen Urunler', $log->stock_changed_products],
                ['Eslesen Varyantlar', $log->matched_variants],
                ['Stok Degisen Varyantlar', $log->stock_changed_variants],
                ['Eslesmeyen', $log->unmatched_count],
                ['Hatali', $log->failed],
                ['Sure (sn)', $log->duration_seconds],
            ]
        );

        if ($log->failed > 0) {
            $this->warn('Hatalar: ' . json_encode($log->error_log, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }
    }
}
