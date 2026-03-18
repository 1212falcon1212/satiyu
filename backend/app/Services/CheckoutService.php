<?php

namespace App\Services;

use App\Models\Address;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    public function createOrder(Customer $customer, array $data, string $sessionId): Order
    {
        $cart = Cache::get("cart:{$sessionId}", []);

        if (empty($cart)) {
            throw ValidationException::withMessages([
                'cart' => ['Sepetiniz bos.'],
            ]);
        }

        $address = Address::where('id', $data['address_id'])
            ->where('customer_id', $customer->id)
            ->firstOrFail();

        $this->validateStock($cart);

        return DB::transaction(function () use ($customer, $data, $cart, $address, $sessionId) {
            $shippingAddress = [
                'title' => $address->title,
                'full_name' => $address->full_name,
                'phone' => $address->phone,
                'city' => $address->city,
                'district' => $address->district,
                'neighborhood' => $address->neighborhood,
                'address_line' => $address->address_line,
                'postal_code' => $address->postal_code,
            ];

            $productIds = array_unique(array_column($cart, 'product_id'));
            $variantIds = array_filter(array_unique(array_column($cart, 'variant_id')));

            $products = Product::whereIn('id', $productIds)->get()->keyBy('id');
            $variants = ProductVariant::whereIn('id', $variantIds)
                ->with(['variantValues.variantOption.variantType'])
                ->get()
                ->keyBy('id');

            $subtotal = 0;
            $orderItems = [];

            foreach ($cart as $cartItem) {
                $product = $products->get($cartItem['product_id']);
                if (!$product) {
                    continue;
                }

                $variant = isset($cartItem['variant_id']) ? $variants->get($cartItem['variant_id']) : null;
                $price = $variant?->price ?? $product->price;
                $lineTotal = $price * $cartItem['quantity'];
                $subtotal += $lineTotal;

                $variantInfo = null;
                if ($variant) {
                    $variantInfo = $variant->variantValues->map(fn ($vv) => [
                        'type' => $vv->variantOption?->variantType?->name,
                        'value' => $vv->variantOption?->value,
                    ])->toArray();
                }

                $orderItems[] = [
                    'product_id' => $product->id,
                    'product_variant_id' => $variant?->id,
                    'product_name' => $product->name,
                    'sku' => $variant?->sku ?? $product->sku,
                    'quantity' => $cartItem['quantity'],
                    'unit_price' => $price,
                    'total_price' => $lineTotal,
                    'variant_info' => $variantInfo,
                ];
            }

            $freeShippingLimit = (float) Setting::get('free_shipping_limit', 500);
            $defaultShippingCost = (float) Setting::get('default_shipping_cost', 0);
            $shippingCost = $subtotal >= $freeShippingLimit ? 0 : $defaultShippingCost;

            // Havale indirimi
            $discount = 0;
            if ($data['payment_method'] === 'bank_transfer') {
                $havaleRate = (float) Setting::get('havale_discount_rate', 0);
                if ($havaleRate > 0) {
                    $discount = round($subtotal * ($havaleRate / 100), 2);
                }
            }

            $total = $subtotal + $shippingCost - $discount;

            $order = Order::create([
                'order_number' => 'KS-' . now()->format('Ymd') . '-' . strtoupper(Str::random(5)),
                'customer_id' => $customer->id,
                'status' => 'pending',
                'payment_status' => 'pending',
                'payment_method' => $data['payment_method'],
                'subtotal' => $subtotal,
                'discount' => $discount,
                'shipping_cost' => $shippingCost,
                'total' => $total,
                'shipping_address' => $shippingAddress,
                'billing_address' => $shippingAddress,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($orderItems as $item) {
                $order->items()->create($item);
            }

            // Decrease stock
            foreach ($cart as $cartItem) {
                if (isset($cartItem['variant_id']) && $cartItem['variant_id']) {
                    ProductVariant::where('id', $cartItem['variant_id'])
                        ->decrement('stock_quantity', $cartItem['quantity']);
                } else {
                    Product::where('id', $cartItem['product_id'])
                        ->decrement('stock_quantity', $cartItem['quantity']);
                }
            }

            // Clear cart
            Cache::forget("cart:{$sessionId}");

            return $order->load('items');
        });
    }

    private function validateStock(array $cart): void
    {
        $productIds = array_unique(array_column($cart, 'product_id'));
        $variantIds = array_filter(array_unique(array_column($cart, 'variant_id')));

        $products = Product::whereIn('id', $productIds)->get()->keyBy('id');
        $variants = ProductVariant::whereIn('id', $variantIds)->get()->keyBy('id');

        $errors = [];
        foreach ($cart as $cartItem) {
            $variant = isset($cartItem['variant_id']) ? $variants->get($cartItem['variant_id']) : null;
            $product = $products->get($cartItem['product_id']);

            if (!$product) {
                $errors[] = "Ürün bulunamadı (ID: {$cartItem['product_id']}).";
                continue;
            }

            $stock = $variant ? $variant->stock_quantity : $product->stock_quantity;
            if ($stock < $cartItem['quantity']) {
                $errors[] = "'{$product->name}' için yeterli stok yok. Mevcut: {$stock}";
            }
        }

        if (!empty($errors)) {
            throw ValidationException::withMessages(['stock' => $errors]);
        }
    }
}
