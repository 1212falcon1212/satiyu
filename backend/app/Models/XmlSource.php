<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class XmlSource extends Model
{
    protected $guarded = [];

    protected $casts = [
        'mapping_config' => 'array',
        'auto_sync' => 'boolean',
        'stock_sync_enabled' => 'boolean',
        'is_active' => 'boolean',
        'barcode_regenerate' => 'boolean',
        'last_synced_at' => 'datetime',
        'last_stock_synced_at' => 'datetime',
    ];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function importLogs(): HasMany
    {
        return $this->hasMany(XmlImportLog::class);
    }

    public function stockSyncLogs(): HasMany
    {
        return $this->hasMany(XmlStockSyncLog::class);
    }

    public function categoryMappings(): HasMany
    {
        return $this->hasMany(XmlCategoryMapping::class);
    }

    public function brandMappings(): HasMany
    {
        return $this->hasMany(XmlBrandMapping::class);
    }

    public function priceRules(): HasMany
    {
        return $this->hasMany(XmlPriceRule::class);
    }

    public function xmlProducts(): HasMany
    {
        return $this->hasMany(XmlProduct::class);
    }
}
