<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'orderNumber' => $this->order_number,
            'customerId' => $this->customer_id,
            'status' => $this->status,
            'paymentStatus' => $this->payment_status,
            'paymentMethod' => $this->payment_method,
            'paymentReceiptUrl' => $this->payment_receipt
                ? asset('storage/' . $this->payment_receipt)
                : null,
            'subtotal' => $this->subtotal,
            'discount' => $this->discount,
            'shippingCost' => $this->shipping_cost,
            'total' => $this->total,
            'shippingAddress' => $this->shipping_address,
            'billingAddress' => $this->billing_address,
            'notes' => $this->notes,
            'createdAt' => $this->created_at,
            'items' => $this->whenLoaded('items', function () {
                return $this->items->map(function ($item) {
                    $mainImage = $item->relationLoaded('product') && $item->product
                        ? ($item->product->images->firstWhere('is_main', true) ?? $item->product->images->first())
                        : null;

                    return [
                        'id' => $item->id,
                        'productId' => $item->product_id,
                        'productVariantId' => $item->product_variant_id,
                        'productName' => $item->product_name,
                        'productSlug' => $item->product?->slug,
                        'imageUrl' => $mainImage?->image_url,
                        'sku' => $item->sku,
                        'quantity' => $item->quantity,
                        'unitPrice' => $item->unit_price,
                        'totalPrice' => $item->total_price,
                        'variantInfo' => $item->variant_info,
                    ];
                });
            }),
            'customer' => $this->whenLoaded('customer', function () {
                return [
                    'id' => $this->customer->id,
                    'name' => $this->customer->name,
                    'email' => $this->customer->email,
                    'phone' => $this->customer->phone,
                ];
            }),
        ];
    }
}
