<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VariantType extends Model
{
    protected $guarded = [];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function variantOptions(): HasMany
    {
        return $this->hasMany(VariantOption::class);
    }

    public function productVariantTypes(): HasMany
    {
        return $this->hasMany(ProductVariantType::class);
    }
}
