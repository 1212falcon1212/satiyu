<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class CartController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $sessionId = $this->getSessionId($request);
        $cart = $this->getCart($sessionId);

        return response()->json([
            'data' => $this->enrichCartItems($cart),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        $product = Product::where('id', $validated['product_id'])
            ->where('is_active', true)
            ->firstOrFail();

        if ($validated['variant_id']) {
            ProductVariant::where('id', $validated['variant_id'])
                ->where('product_id', $product->id)
                ->where('is_active', true)
                ->firstOrFail();
        }

        $sessionId = $this->getSessionId($request);
        $cart = $this->getCart($sessionId);

        $cartKey = $validated['product_id'] . '-' . ($validated['variant_id'] ?? '0');

        $existingIndex = collect($cart)->search(fn ($item) => $this->getCartKey($item) === $cartKey);

        if ($existingIndex !== false) {
            $cart[$existingIndex]['quantity'] += $validated['quantity'];
        } else {
            $cart[] = [
                'id' => (string) Str::uuid(),
                'product_id' => $validated['product_id'],
                'variant_id' => $validated['variant_id'],
                'quantity' => $validated['quantity'],
            ];
        }

        $this->saveCart($sessionId, $cart);

        return response()->json([
            'data' => $this->enrichCartItems($cart),
        ], Response::HTTP_CREATED);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        $sessionId = $this->getSessionId($request);
        $cart = $this->getCart($sessionId);

        $index = collect($cart)->search(fn ($item) => $item['id'] === $id);

        if ($index === false) {
            return response()->json([
                'message' => 'Cart item not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        $cart[$index]['quantity'] = $validated['quantity'];
        $this->saveCart($sessionId, $cart);

        return response()->json([
            'data' => $this->enrichCartItems($cart),
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $sessionId = $this->getSessionId($request);
        $cart = $this->getCart($sessionId);

        $cart = array_values(
            array_filter($cart, fn ($item) => $item['id'] !== $id),
        );

        $this->saveCart($sessionId, $cart);

        return response()->json([
            'data' => $this->enrichCartItems($cart),
        ]);
    }

    private function getSessionId(Request $request): string
    {
        $sessionId = $request->header('X-Session-Id');

        if (!$sessionId) {
            $sessionId = (string) Str::uuid();
        }

        return $sessionId;
    }

    private function getCart(string $sessionId): array
    {
        return Cache::get("cart:{$sessionId}", []);
    }

    private function saveCart(string $sessionId, array $cart): void
    {
        Cache::put("cart:{$sessionId}", $cart, now()->addDays(7));
    }

    private function getCartKey(array $item): string
    {
        return $item['product_id'] . '-' . ($item['variant_id'] ?? '0');
    }

    private function enrichCartItems(array $cart): array
    {
        if (empty($cart)) {
            return [
                'items' => [],
                'total' => 0,
                'itemCount' => 0,
            ];
        }

        $productIds = array_unique(array_column($cart, 'product_id'));
        $variantIds = array_filter(array_unique(array_column($cart, 'variant_id')));

        $products = Product::whereIn('id', $productIds)
            ->with(['images'])
            ->get()
            ->keyBy('id');

        $variants = ProductVariant::whereIn('id', $variantIds)
            ->with(['variantValues.variantOption.variantType'])
            ->get()
            ->keyBy('id');

        $total = 0;
        $items = [];

        foreach ($cart as $cartItem) {
            $product = $products->get($cartItem['product_id']);
            if (!$product) {
                continue;
            }

            $variant = isset($cartItem['variant_id']) ? $variants->get($cartItem['variant_id']) : null;
            $price = $variant?->price ?? $product->price;
            $comparePrice = $variant?->compare_price ?? $product->compare_price;
            $lineTotal = $price * $cartItem['quantity'];
            $total += $lineTotal;

            $mainImage = $product->images->firstWhere('is_main', true) ?? $product->images->first();

            $item = [
                'id' => $cartItem['id'],
                'productId' => $product->id,
                'productName' => $product->name,
                'productSlug' => $product->slug,
                'imageUrl' => $mainImage?->image_url,
                'price' => (float) $price,
                'comparePrice' => $comparePrice ? (float) $comparePrice : null,
                'quantity' => $cartItem['quantity'],
                'lineTotal' => (float) $lineTotal,
                'variantId' => $cartItem['variant_id'],
            ];

            if ($variant) {
                $item['variantInfo'] = $variant->variantValues->map(fn ($vv) => [
                    'type' => $vv->variantOption?->variantType?->name,
                    'value' => $vv->variantOption?->value,
                ])->toArray();
            }

            $items[] = $item;
        }

        return [
            'items' => $items,
            'total' => (float) $total,
            'itemCount' => count($items),
        ];
    }
}
