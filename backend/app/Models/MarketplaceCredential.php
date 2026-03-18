<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketplaceCredential extends Model
{
    protected $guarded = [];

    protected $hidden = [
        'api_key',
        'api_secret',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'api_key' => 'encrypted',
            'api_secret' => 'encrypted',
        ];
    }
}
