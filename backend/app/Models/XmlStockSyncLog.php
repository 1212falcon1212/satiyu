<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class XmlStockSyncLog extends Model
{
    protected $guarded = [];

    protected $casts = [
        'xml_product_count' => 'integer',
        'matched_products' => 'integer',
        'stock_changed_products' => 'integer',
        'matched_variants' => 'integer',
        'stock_changed_variants' => 'integer',
        'unmatched_count' => 'integer',
        'failed' => 'integer',
        'error_log' => 'array',
        'changes_summary' => 'array',
        'duration_seconds' => 'integer',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function xmlSource(): BelongsTo
    {
        return $this->belongsTo(XmlSource::class);
    }
}
