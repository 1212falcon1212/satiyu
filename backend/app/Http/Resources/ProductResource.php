<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'shortDescription' => $this->short_description,
            'price' => $this->price,
            'comparePrice' => $this->compare_price,
            'costPrice' => $this->cost_price,
            'currency' => $this->currency,
            'stockQuantity' => $this->stock_quantity,
            'stockStatus' => $this->stock_status,
            'weight' => $this->weight,
            'width' => $this->width,
            'height' => $this->height,
            'length' => $this->length,
            'brandId' => $this->brand_id,
            'categoryId' => $this->category_id,
            'isActive' => $this->is_active,
            'isFeatured' => $this->is_featured,
            'showOnHomepage' => $this->show_on_homepage,
            'isNew' => $this->is_new,
            'metaTitle' => $this->meta_title,
            'metaDescription' => $this->meta_description,
            'sortOrder' => $this->sort_order,
            'brand' => new BrandResource($this->whenLoaded('brand')),
            'category' => new CategoryResource($this->whenLoaded('category')),
            'images' => $this->whenLoaded('images', function () {
                return $this->images->map(fn ($image) => [
                    'id' => $image->id,
                    'imageUrl' => $image->image_url,
                    'sortOrder' => $image->sort_order,
                    'isMain' => $image->is_main,
                    'altText' => $image->alt_text,
                ]);
            }),
            'variants' => ProductVariantResource::collection($this->whenLoaded('variants')),
            'attributes' => $this->whenLoaded('attributes', function () {
                return $this->attributes->map(fn ($attr) => [
                    'id' => $attr->id,
                    'name' => $attr->attribute_name,
                    'value' => $attr->attribute_value,
                ]);
            }),
            'reviewStats' => $this->whenLoaded('reviews', function () {
                $approved = $this->reviews->where('is_approved', true);
                return [
                    'average' => round($approved->avg('rating') ?? 0, 1),
                    'count' => $approved->count(),
                ];
            }),
        ];
    }
}
