<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryTreeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'parentId' => $this->parent_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'icon' => $this->icon,
            'imageUrl' => $this->image_url,
            'bannerImageUrl' => $this->banner_image_url,
            'depth' => $this->depth,
            'path' => $this->path,
            'isActive' => $this->is_active,
            'isFeatured' => $this->is_featured,
            'homepageProductIds' => $this->homepage_product_ids ?? [],
            'showcaseTitle' => $this->showcase_title,
            'sortOrder' => $this->sort_order,
            'metaTitle' => $this->meta_title,
            'metaDescription' => $this->meta_description,
            'productCount' => $this->product_count,
            'children' => CategoryTreeResource::collection($this->whenLoaded('children')),
        ];
    }
}
