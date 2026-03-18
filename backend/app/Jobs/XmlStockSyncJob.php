<?php

namespace App\Jobs;

use App\Models\XmlSource;
use App\Services\Xml\XmlStockSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class XmlStockSyncJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;
    public int $tries = 2;

    public function __construct(
        public int $xmlSourceId,
    ) {}

    public function handle(XmlStockSyncService $service): void
    {
        $source = XmlSource::findOrFail($this->xmlSourceId);
        $service->sync($source);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('XmlStockSyncJob failed', [
            'xml_source_id' => $this->xmlSourceId,
            'error' => $exception->getMessage(),
        ]);
    }
}
