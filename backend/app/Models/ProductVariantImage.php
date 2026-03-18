<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductVariantImage extends Model
{
    protected $guarded = [];

    protected $casts = [
        'sort_order' => 'integer',
        'is_main' => 'boolean',
    ];

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }
}
