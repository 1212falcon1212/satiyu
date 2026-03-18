<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class XmlPriceRule extends Model
{
    protected $guarded = [];

    protected $casts = [
        'value' => 'decimal:2',
        'include_vat' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function xmlSource(): BelongsTo
    {
        return $this->belongsTo(XmlSource::class);
    }
}
