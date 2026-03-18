<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'price' => $this->price,
            'comparePrice' => $this->compare_price,
            'stockQuantity' => $this->stock_quantity,
            'stockStatus' => $this->stock_status,
            'isActive' => $this->is_active,
            'isFeatured' => $this->is_featured,
            'showOnHomepage' => $this->show_on_homepage,
            'isBestseller' => $this->is_bestseller,
            'isNew' => $this->is_new,
            'mainImage' => $this->whenLoaded('images', function () {
                $main = $this->images->firstWhere('is_main', true) ?? $this->images->first();
                return $main ? $main->image_url : null;
            }),
            'brandName' => $this->whenLoaded('brand', fn () => $this->brand?->name),
            'categoryName' => $this->whenLoaded('category', fn () => $this->category?->name),
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
