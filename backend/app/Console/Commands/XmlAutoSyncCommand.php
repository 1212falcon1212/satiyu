<?php

namespace App\Console\Commands;

use App\Jobs\XmlImportJob;
use App\Models\XmlSource;
use Illuminate\Console\Command;

class XmlAutoSyncCommand extends Command
{
    protected $signature = 'xml:auto-sync';
    protected $description = 'Otomatik senkronizasyon aktif olan XML kaynaklarını kontrol et ve import başlat';

    public function handle(): int
    {
        $sources = XmlSource::where('is_active', true)
            ->where('auto_sync', true)
            ->get();

        if ($sources->isEmpty()) {
            $this->info('Otomatik senkronizasyon yapılacak kaynak bulunamadı.');
            return self::SUCCESS;
        }

        $dispatched = 0;

        foreach ($sources as $source) {
            if (!$this->shouldSync($source)) {
                continue;
            }

            XmlImportJob::dispatch($source->id);
            $dispatched++;
            $this->info("Import dispatched: {$source->name} (ID: {$source->id})");
        }

        $this->info("Toplam {$dispatched} kaynak için import başlatıldı.");

        return self::SUCCESS;
    }

    protected function shouldSync(XmlSource $source): bool
    {
        if (!$source->last_synced_at) {
            return true;
        }

        $interval = match ($source->sync_interval) {
            'hourly' => 60,
            'daily' => 1440,
            'weekly' => 10080,
            'monthly' => 43200,
            default => 1440,
        };

        return $source->last_synced_at->diffInMinutes(now()) >= $interval;
    }
}
