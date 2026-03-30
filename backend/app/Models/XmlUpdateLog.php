<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class XmlUpdateLog extends Model
{
    protected $fillable = [
        'xml_source_id',
        'product_id',
        'product_name',
        'change_type',
        'old_price',
        'new_price',
        'old_stock',
        'new_stock',
        'source_name',
    ];

    protected $casts = [
        'old_price' => 'decimal:2',
        'new_price' => 'decimal:2',
        'old_stock' => 'integer',
        'new_stock' => 'integer',
    ];

    public function xmlSource(): BelongsTo
    {
        return $this->belongsTo(XmlSource::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
