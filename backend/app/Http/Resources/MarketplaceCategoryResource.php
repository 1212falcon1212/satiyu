<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MarketplaceCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'marketplace' => $this->marketplace,
            'marketplaceCategoryId' => (int) $this->marketplace_category_id,
            'categoryName' => $this->category_name,
            'parentId' => $this->parent_id,
            'attributes' => $this->attributes,
            'children' => $this->relationLoaded('allChildren')
                ? self::collection($this->allChildren)
                : self::collection($this->whenLoaded('children')),
            'lastSyncedAt' => $this->last_synced_at?->toISOString(),
        ];
    }
}
