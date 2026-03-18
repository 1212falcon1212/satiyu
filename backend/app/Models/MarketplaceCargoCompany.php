<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketplaceCargoCompany extends Model
{
    protected $guarded = [];

    protected $casts = [
        'is_default' => 'boolean',
    ];
}
