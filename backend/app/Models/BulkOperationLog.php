<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BulkOperationLog extends Model
{
    protected $guarded = [];

    protected $casts = [
        'params' => 'array',
        'original_values' => 'array',
        'reverted' => 'boolean',
        'reverted_at' => 'datetime',
    ];

    public function xmlSource(): BelongsTo
    {
        return $this->belongsTo(XmlSource::class);
    }
}
