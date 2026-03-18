<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MarketplaceProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'productId' => $this->product_id,
            'marketplace' => $this->marketplace,
            'marketplaceProductId' => $this->marketplace_product_id,
            'marketplaceBarcode' => $this->marketplace_barcode,
            'status' => $this->status,
            'price' => (float) $this->price,
            'salePrice' => (float) $this->sale_price,
            'commissionRate' => $this->commission_rate ? (float) $this->commission_rate : null,
            'listingData' => $this->listing_data,
            'errorMessage' => $this->error_message,
            'lastSyncedAt' => $this->last_synced_at?->toISOString(),
            'product' => $this->whenLoaded('product', fn() => [
                'name' => $this->product->name,
                'barcode' => $this->product->barcode,
                'images' => $this->product->images?->map(fn($img) => $img->image_url)->toArray() ?? [],
            ]),
        ];
    }
}
