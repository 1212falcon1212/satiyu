<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'productId' => $this->product_id,
            'customerId' => $this->customer_id,
            'orderId' => $this->order_id,
            'rating' => $this->rating,
            'title' => $this->title,
            'comment' => $this->comment,
            'isApproved' => $this->is_approved,
            'createdAt' => $this->created_at,
            'customer' => $this->whenLoaded('customer', function () {
                return [
                    'id' => $this->customer->id,
                    'name' => $this->customer->name,
                ];
            }),
        ];
    }
}
