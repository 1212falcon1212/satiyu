<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class XmlCategoryMapping extends Model
{
    protected $guarded = [];

    protected $casts = [
        'create_if_missing' => 'boolean',
    ];

    public function xmlSource(): BelongsTo
    {
        return $this->belongsTo(XmlSource::class);
    }

    public function localCategory(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'local_category_id');
    }
}
