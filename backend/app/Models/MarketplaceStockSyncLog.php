<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketplaceStockSyncLog extends Model
{
    protected $guarded = [];

    protected $casts = [
        'batch_request_ids' => 'array',
        'error_log' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function credential(): BelongsTo
    {
        return $this->belongsTo(MarketplaceCredential::class, 'credential_id');
    }
}
