<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class XmlImportLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $startedAt = $this->started_at;
        $completedAt = $this->completed_at;
        $duration = ($startedAt && $completedAt) ? $startedAt->diffInSeconds($completedAt) : null;

        return [
            'id' => $this->id,
            'xmlSourceId' => $this->xml_source_id,
            'totalProducts' => $this->total_products,
            'created' => $this->created,
            'updated' => $this->updated,
            'failed' => $this->failed,
            'errorLog' => $this->error_log,
            'startedAt' => $startedAt?->toISOString(),
            'completedAt' => $completedAt?->toISOString(),
            'duration' => $duration,
        ];
    }
}
