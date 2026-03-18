<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

class Category extends Model
{
    use HasSlug;

    protected $guarded = [];

    protected $casts = [
        'is_active' => 'boolean',
        'is_featured' => 'boolean',
        'homepage_product_ids' => 'array',
        'depth' => 'integer',
        'sort_order' => 'integer',
        'product_count' => 'integer',
    ];

    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('name')
            ->saveSlugsTo('slug');
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Category $category) {
            $category->calculateDepthAndPath();
        });

        static::updating(function (Category $category) {
            if ($category->isDirty('parent_id')) {
                $category->calculateDepthAndPath();
            }
        });
    }

    protected function calculateDepthAndPath(): void
    {
        if ($this->parent_id) {
            $parent = static::find($this->parent_id);
            $this->depth = $parent ? $parent->depth + 1 : 0;
            $this->path = $parent ? ltrim($parent->path . '/' . $parent->id, '/') : null;
        } else {
            $this->depth = 0;
            $this->path = null;
        }
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function marketplaceCategoryMappings(): HasMany
    {
        return $this->hasMany(MarketplaceCategoryMapping::class, 'local_category_id');
    }
}
