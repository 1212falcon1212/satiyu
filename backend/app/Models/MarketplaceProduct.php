<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketplaceProduct extends Model
{
    protected $guarded = [];

    protected $casts = [
        'price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'commission_rate' => 'decimal:2',
        'listing_data' => 'array',
        'last_synced_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function getVariantData(int $variantId): ?array
    {
        $data = $this->listing_data ?? [];

        return $data['variants'][$variantId] ?? null;
    }

    public function setVariantData(int $variantId, array $data): void
    {
        $listingData = $this->listing_data ?? [];
        $listingData['variants'][$variantId] = $data;
        $this->listing_data = $listingData;
        $this->save();
    }

    public function hasVariantTracking(): bool
    {
        $data = $this->listing_data ?? [];

        return ! empty($data['variants']);
    }
}
