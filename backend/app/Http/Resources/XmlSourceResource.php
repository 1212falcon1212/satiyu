<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class XmlSourceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'url' => $this->url,
            'type' => $this->type,
            'mappingConfig' => $this->mapping_config,
            'stockSyncEnabled' => (bool) $this->stock_sync_enabled,
            'lastSyncedAt' => $this->last_stock_synced_at?->toISOString() ?? $this->last_synced_at?->toISOString(),
            'isActive' => $this->is_active,
            'productCount' => $this->whenCounted('products'),
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}
