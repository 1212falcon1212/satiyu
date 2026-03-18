<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketplaceCategory extends Model
{
    protected $guarded = [];

    protected $casts = [
        'attributes' => 'array',
        'last_synced_at' => 'datetime',
    ];

    public function parent()
    {
        return $this->belongsTo(MarketplaceCategory::class, 'parent_id', 'marketplace_category_id')
            ->where('marketplace', $this->marketplace);
    }

    public function children(): HasMany
    {
        return $this->hasMany(MarketplaceCategory::class, 'parent_id', 'marketplace_category_id');
    }

    public function allChildren(): HasMany
    {
        return $this->children()->with('allChildren');
    }

    public function categoryMappings(): HasMany
    {
        return $this->hasMany(MarketplaceCategoryMapping::class);
    }
}
