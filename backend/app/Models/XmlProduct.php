<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class XmlProduct extends Model
{
    protected $guarded = [];

    protected $casts = [
        'raw_data' => 'array',
        'mapped_data' => 'array',
        'changes_detected' => 'array',
        'price_in_xml' => 'decimal:2',
        'last_seen_at' => 'datetime',
    ];

    public function xmlSource(): BelongsTo
    {
        return $this->belongsTo(XmlSource::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'local_product_id');
    }

    public function scopeBySource(Builder $query, int $sourceId): Builder
    {
        return $query->where('xml_source_id', $sourceId);
    }

    public function scopeUnmatched(Builder $query): Builder
    {
        return $query->whereNull('local_product_id');
    }

    public function scopeWithChanges(Builder $query): Builder
    {
        return $query->whereNotNull('changes_detected')
            ->where('changes_detected', '!=', '[]')
            ->where('changes_detected', '!=', 'null');
    }
}
