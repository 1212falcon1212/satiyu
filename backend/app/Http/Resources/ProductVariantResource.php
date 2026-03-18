<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductVariantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'productId' => $this->product_id,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'price' => $this->price,
            'comparePrice' => $this->compare_price,
            'costPrice' => $this->cost_price,
            'stockQuantity' => $this->stock_quantity,
            'weight' => $this->weight,
            'isActive' => $this->is_active,
            'sortOrder' => $this->sort_order,
            'variantValues' => $this->whenLoaded('variantValues', function () {
                return $this->variantValues->map(fn ($value) => [
                    'id' => $value->id,
                    'optionValue' => $value->variantOption->value ?? null,
                    'colorCode' => $value->variantOption->color_code ?? null,
                    'typeName' => $value->variantOption->variantType->name ?? null,
                    'displayType' => $value->variantOption->variantType->display_type ?? null,
                ]);
            }),
            'images' => $this->whenLoaded('images', function () {
                return $this->images->map(fn ($image) => [
                    'id' => $image->id,
                    'imageUrl' => $image->image_url,
                    'sortOrder' => $image->sort_order,
                    'isMain' => $image->is_main,
                ]);
            }),
        ];
    }
}
