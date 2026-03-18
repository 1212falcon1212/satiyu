<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class XmlImportLog extends Model
{
    protected $guarded = [];

    protected $casts = [
        'total_products' => 'integer',
        'created' => 'integer',
        'updated' => 'integer',
        'failed' => 'integer',
        'error_log' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function xmlSource(): BelongsTo
    {
        return $this->belongsTo(XmlSource::class);
    }
}
