<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Scout\Searchable;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

class Product extends Model
{
    use HasSlug, SoftDeletes, Searchable;

    protected $guarded = [];

    protected $casts = [
        'price' => 'decimal:2',
        'compare_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'weight' => 'decimal:2',
        'width' => 'decimal:2',
        'height' => 'decimal:2',
        'length' => 'decimal:2',
        'desi' => 'integer',
        'vat_rate' => 'integer',
        'stock_quantity' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
        'is_featured' => 'boolean',
        'show_on_homepage' => 'boolean',
        'is_bestseller' => 'boolean',
        'is_new' => 'boolean',
    ];

    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('name')
            ->saveSlugsTo('slug');
    }

    /**
     * Meilisearch: only index active products
     */
    public function shouldBeSearchable(): bool
    {
        return $this->is_active && !$this->trashed();
    }

    /**
     * Meilisearch: searchable data
     */
    public function toSearchableArray(): array
    {
        $mainImage = $this->images?->firstWhere('is_main', true) ?? $this->images?->first();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'description' => $this->short_description ?? mb_substr(strip_tags($this->description ?? ''), 0, 300),
            'price' => (float) $this->price,
            'compare_price' => $this->compare_price ? (float) $this->compare_price : null,
            'stock_quantity' => (int) $this->stock_quantity,
            'stock_status' => $this->stock_status,
            'is_active' => $this->is_active,
            'is_featured' => $this->is_featured,
            'is_bestseller' => $this->is_bestseller,
            'is_new' => $this->is_new,
            'brand_id' => $this->brand_id,
            'brand_name' => $this->brand?->name,
            'category_id' => $this->category_id,
            'category_name' => $this->category?->name,
            'main_image' => $mainImage?->image_url,
            'created_at' => $this->created_at?->timestamp,
        ];
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function xmlSource(): BelongsTo
    {
        return $this->belongsTo(XmlSource::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function attributes(): HasMany
    {
        return $this->hasMany(ProductAttribute::class);
    }

    public function productVariantTypes(): HasMany
    {
        return $this->hasMany(ProductVariantType::class);
    }

    public function marketplaceProducts(): HasMany
    {
        return $this->hasMany(MarketplaceProduct::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }
}
