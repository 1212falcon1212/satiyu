<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProcessPaymentRequest;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\PayTRService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class PayTRController extends Controller
{
    public function __construct(
        private PayTRService $payTRService,
    ) {}

    public function processPayment(ProcessPaymentRequest $request, Order $order): JsonResponse
    {
        abort_unless($order->customer_id === $request->user()->id, 403);
        abort_unless($order->payment_method === 'credit_card', 422, 'Bu sipariş kredi kartı ödemesi değil.');
        abort_unless($order->payment_status === 'pending', 422, 'Bu siparişin ödemesi zaten işlenmiş.');

        $order->load(['items.product', 'items.productVariant', 'customer']);

        $cardData = $request->only([
            'cc_owner', 'card_number', 'expiry_month', 'expiry_year',
            'cvv', 'installment_count', 'card_type',
        ]);

        // Taksitli ödemede indirimsiz fiyat (compare_price) üzerinden ödeme al
        $installmentCount = (int) ($cardData['installment_count'] ?? 0);
        if ($installmentCount > 0) {
            $undiscountedSubtotal = 0;
            foreach ($order->items as $item) {
                $variant = $item->productVariant;
                $product = $item->product;
                $comparePrice = $variant?->compare_price ?? $product?->compare_price;
                $unitPrice = $comparePrice && $comparePrice > $item->unit_price
                    ? (float) $comparePrice
                    : $item->unit_price;
                $undiscountedSubtotal += $unitPrice * $item->quantity;
            }

            $newTotal = $undiscountedSubtotal + $order->shipping_cost;

            if ($newTotal > $order->total) {
                Log::info('PayTR: Taksitli ödeme, indirimsiz fiyat uygulanıyor', [
                    'order' => $order->order_number,
                    'old_total' => $order->total,
                    'new_total' => $newTotal,
                    'installment_count' => $installmentCount,
                ]);

                $order->update([
                    'subtotal' => $undiscountedSubtotal,
                    'discount' => 0,
                    'total' => $newTotal,
                ]);
                $order->refresh();
            }
        }

        $ctoken = $request->input('ctoken');
        $utoken = $order->customer->paytr_utoken;

        // Zaten utoken varsa kartı tekrar kaydetme
        $storeCard = (bool) $request->input('store_card', false);
        if ($storeCard && $utoken) {
            $storeCard = false;
        }

        Log::info('PayTR processPayment', [
            'order' => $order->order_number,
            'store_card' => $storeCard,
            'has_ctoken' => !empty($ctoken),
            'has_utoken' => !empty($utoken),
            'amount' => $order->total,
            'installment_count' => $installmentCount,
        ]);

        $result = $this->payTRService->processDirectPayment(
            $order, $cardData, $request->ip(), $storeCard, $utoken, $ctoken
        );

        Log::info('PayTR processPayment result', [
            'order' => $order->order_number,
            'success' => $result['success'],
            'type' => $result['type'] ?? 'none',
        ]);

        if (!$result['success']) {
            return response()->json(['message' => $result['message']], 422);
        }

        if (($result['type'] ?? '') === '3d_secure') {
            return response()->json([
                'type' => '3d_secure',
                'html' => $result['html'],
            ]);
        }

        return response()->json(['type' => 'success']);
    }

    public function binLookup(Request $request): JsonResponse
    {
        $request->validate([
            'bin_number' => 'required|string|min:6|max:8',
        ]);

        $result = $this->payTRService->binLookup($request->input('bin_number'));

        if (!$result['success']) {
            return response()->json(['message' => $result['message']], 422);
        }

        return response()->json($result);
    }

    public function installmentRates(): JsonResponse
    {
        $rates = Cache::remember('paytr_installment_rates', 3600, function () {
            return $this->payTRService->getInstallmentRates();
        });

        if (!$rates['success']) {
            return response()->json(['message' => $rates['message']], 422);
        }

        // PayTR returns: { "world": { "taksit_2": "3.8", "taksit_3": "5.67", ... }, ... }
        // Frontend expects: { "world": [{ "count": 2, "rate": 3.8 }, ...], ... }
        $formatted = [];
        foreach ($rates['installment_rates'] as $brand => $brandRates) {
            $formatted[$brand] = [];
            if (is_array($brandRates)) {
                foreach ($brandRates as $key => $rate) {
                    $count = (int) str_replace('taksit_', '', $key);
                    if ($count > 0) {
                        $formatted[$brand][] = [
                            'count' => $count,
                            'rate' => (float) $rate,
                        ];
                    }
                }
            }
        }

        return response()->json([
            'success' => true,
            'installment_rates' => $formatted,
        ]);
    }

    public function callback(Request $request): Response
    {
        $post = $request->all();

        Log::info('PayTR callback received', [
            'merchant_oid' => $post['merchant_oid'] ?? 'N/A',
            'status' => $post['status'] ?? 'N/A',
            'has_utoken' => !empty($post['utoken']),
            'total_amount' => $post['total_amount'] ?? 'N/A',
        ]);

        if (!$this->payTRService->verifyCallback($post)) {
            Log::warning('PayTR callback hash mismatch', ['post' => $post]);
            return response('HASH_MISMATCH', 400);
        }

        // merchant_oid is sent without dashes, restore original format: KS20260302XXXXX → KS-20260302-XXXXX
        $oid = $post['merchant_oid'];
        $orderNumber = preg_replace('/^(KS)(\d{8})(.+)$/', '$1-$2-$3', $oid);
        $order = Order::where('order_number', $orderNumber)->first();

        if (!$order) {
            Log::warning('PayTR callback: order not found', ['merchant_oid' => $post['merchant_oid']]);
            return response('OK');
        }

        // Duplicate check: already processed
        if ($order->payment_status === 'paid' || $order->payment_status === 'failed') {
            Log::info('PayTR callback duplicate', ['order' => $orderNumber, 'current_status' => $order->payment_status]);
            return response('OK');
        }

        if ($post['status'] === 'success') {
            $order->update([
                'payment_status' => 'paid',
                'status' => 'confirmed',
            ]);

            // Save utoken for card storage feature
            if (!empty($post['utoken']) && $order->customer) {
                $order->customer->update(['paytr_utoken' => $post['utoken']]);
                Log::info('PayTR utoken saved', ['order' => $orderNumber, 'customer_id' => $order->customer_id]);
            }
        } else {
            $order->update([
                'payment_status' => 'failed',
            ]);

            // Restore stock
            foreach ($order->items as $item) {
                if ($item->product_variant_id) {
                    ProductVariant::where('id', $item->product_variant_id)
                        ->increment('stock_quantity', $item->quantity);
                } elseif ($item->product_id) {
                    Product::where('id', $item->product_id)
                        ->increment('stock_quantity', $item->quantity);
                }
            }
            Log::info('PayTR payment failed, stock restored', ['order' => $orderNumber]);
        }

        Log::info('PayTR callback processed', [
            'order' => $orderNumber,
            'status' => $post['status'],
        ]);

        return response('OK');
    }

    public function listCards(Request $request): JsonResponse
    {
        $customer = $request->user();
        $utoken = $customer->paytr_utoken;

        if (!$utoken) {
            return response()->json(['cards' => []]);
        }

        $result = $this->payTRService->listCards($utoken);

        return response()->json(['cards' => $result['cards'] ?? []]);
    }

    public function deleteCard(Request $request): JsonResponse
    {
        $request->validate([
            'ctoken' => 'required|string',
        ]);

        $customer = $request->user();
        $utoken = $customer->paytr_utoken;

        if (!$utoken) {
            return response()->json(['message' => 'Kayıtlı kart bulunamadı.'], 422);
        }

        $result = $this->payTRService->deleteCard($utoken, $request->input('ctoken'));

        if (!$result['success']) {
            return response()->json(['message' => $result['message']], 422);
        }

        return response()->json(['success' => true]);
    }
}
