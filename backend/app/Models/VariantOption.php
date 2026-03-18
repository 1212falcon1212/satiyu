<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VariantOption extends Model
{
    protected $guarded = [];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function variantType(): BelongsTo
    {
        return $this->belongsTo(VariantType::class);
    }

    public function productVariantValues(): HasMany
    {
        return $this->hasMany(ProductVariantValue::class);
    }
}
