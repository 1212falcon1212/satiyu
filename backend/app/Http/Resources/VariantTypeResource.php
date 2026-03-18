<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VariantTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'displayType' => $this->display_type,
            'sortOrder' => $this->sort_order,
            'options' => $this->whenLoaded('variantOptions', function () {
                return $this->variantOptions->map(fn ($option) => [
                    'id' => $option->id,
                    'value' => $option->value,
                    'colorCode' => $option->color_code,
                    'imageUrl' => $option->image_url,
                    'sortOrder' => $option->sort_order,
                ]);
            }),
        ];
    }
}
