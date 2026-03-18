<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class XmlBrandMapping extends Model
{
    protected $guarded = [];

    public function xmlSource(): BelongsTo
    {
        return $this->belongsTo(XmlSource::class);
    }

    public function localBrand(): BelongsTo
    {
        return $this->belongsTo(Brand::class, 'local_brand_id');
    }
}
