<?php

namespace App\Jobs;

use App\Models\XmlImportLog;
use App\Models\XmlSource;
use App\Services\Xml\XmlImportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class XmlImportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 1800;
    public int $tries = 1;

    public function __construct(
        public readonly int $xmlSourceId,
        public readonly array $filters = [],
    ) {}

    public function handle(XmlImportService $importService): void
    {
        $source = XmlSource::findOrFail($this->xmlSourceId);

        Log::info('XML import başladı', ['source_id' => $source->id, 'name' => $source->name]);

        $log = $importService->import($source, $this->filters);

        Log::info('XML import tamamlandı', [
            'source_id' => $source->id,
            'created' => $log->created,
            'updated' => $log->updated,
            'failed' => $log->failed,
        ]);
    }

    public function failed(?\Throwable $exception): void
    {
        Log::error('XML import job başarısız', [
            'source_id' => $this->xmlSourceId,
            'error' => $exception?->getMessage(),
        ]);

        // Merge into existing cache to preserve partial progress stats
        $cacheKey = XmlImportService::cacheKey($this->xmlSourceId);
        $existing = Cache::get($cacheKey, []);
        Cache::put($cacheKey, array_merge($existing, [
            'status' => 'failed',
            'error' => $exception?->getMessage() ?? 'Bilinmeyen hata',
            'updated_at' => now()->toISOString(),
        ]), 3600);

        // Only create log if service didn't already handle it
        $hasRecentLog = XmlImportLog::where('xml_source_id', $this->xmlSourceId)
            ->where('started_at', '>=', now()->subMinutes(30))
            ->whereNotNull('completed_at')
            ->exists();

        if (!$hasRecentLog) {
            XmlImportLog::create([
                'xml_source_id' => $this->xmlSourceId,
                'total_products' => 0,
                'created' => 0,
                'updated' => 0,
                'failed' => 0,
                'error_log' => [$exception?->getMessage() ?? 'Bilinmeyen hata'],
                'started_at' => now(),
                'completed_at' => now(),
            ]);
        }
    }
}
