<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\RefundRequest;
use App\Services\PayTRService;
use App\Services\SettingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class RefundController extends Controller
{
    public function store(Request $request, Order $order): JsonResponse
    {
        $customer = $request->user();

        if ($order->customer_id !== $customer->id) {
            return response()->json(['message' => 'Bu siparişe erişim yetkiniz yok.'], 403);
        }

        if (! in_array($order->status, ['shipped', 'delivered'])) {
            return response()->json(['message' => 'Sadece kargoda veya teslim edilmiş siparişler için iade talebi oluşturabilirsiniz.'], 422);
        }

        if ($order->payment_status !== 'paid') {
            return response()->json(['message' => 'Ödemesi tamamlanmamış siparişler için iade talebi oluşturulamaz.'], 422);
        }

        $settingService = app(SettingService::class);
        $refundDays = (int) $settingService->get('refund_days', '14');
        $referenceDate = $order->updated_at;
        if ($referenceDate->diffInDays(now()) > $refundDays) {
            return response()->json(['message' => "İade süresi ({$refundDays} gün) dolmuştur."], 422);
        }

        $existingRefund = RefundRequest::where('order_id', $order->id)
            ->whereIn('status', ['pending', 'approved'])
            ->exists();

        if ($existingRefund) {
            return response()->json(['message' => 'Bu sipariş için zaten aktif bir iade talebi bulunmaktadır.'], 422);
        }

        $request->validate([
            'reason' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'images' => 'nullable|array|max:5',
            'images.*' => 'image|max:5120',
        ]);

        $imagePaths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('refunds', 'public');
                $imagePaths[] = $path;
            }
        }

        $refund = RefundRequest::create([
            'order_id' => $order->id,
            'customer_id' => $customer->id,
            'reason' => $request->reason,
            'description' => $request->description,
            'images' => !empty($imagePaths) ? $imagePaths : null,
            'refund_amount' => $order->total,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'İade talebiniz başarıyla oluşturuldu.',
            'data' => $refund,
        ], 201);
    }

    /**
     * Müşteri sipariş iptali (pending, confirmed, preparing durumlarında)
     * Ödeme yapılmış kredi kartı siparişlerinde PayTR iade API tetiklenir.
     */
    public function cancel(Request $request, Order $order): JsonResponse
    {
        $customer = $request->user();

        if ($order->customer_id !== $customer->id) {
            return response()->json(['message' => 'Bu siparişe erişim yetkiniz yok.'], 403);
        }

        if (! in_array($order->status, ['pending', 'confirmed', 'preparing'])) {
            return response()->json(['message' => 'Bu sipariş iptal edilemez.'], 422);
        }

        $order->load('items');

        // Kredi kartı ile ödenmişse PayTR iade başlat
        if ($order->payment_status === 'paid' && $order->payment_method === 'credit_card') {
            $paytrService = app(PayTRService::class);
            $result = $paytrService->processRefund($order, (string) $order->total);

            if (! $result['success']) {
                Log::error('PayTR cancel refund failed', ['order' => $order->order_number, 'message' => $result['message']]);
                return response()->json(['message' => 'İade işlemi başarısız: ' . $result['message']], 422);
            }

            $order->update([
                'status' => 'cancelled',
                'payment_status' => 'refunded',
            ]);

            Log::info('Order cancelled with PayTR refund', ['order' => $order->order_number]);
        } else {
            $order->update([
                'status' => 'cancelled',
            ]);

            Log::info('Order cancelled', ['order' => $order->order_number, 'payment_status' => $order->payment_status]);
        }

        // Stok iadesi
        foreach ($order->items as $item) {
            if ($item->product_variant_id) {
                ProductVariant::where('id', $item->product_variant_id)
                    ->increment('stock_quantity', $item->quantity);
            } elseif ($item->product_id) {
                Product::where('id', $item->product_id)
                    ->increment('stock_quantity', $item->quantity);
            }
        }

        return response()->json([
            'message' => 'Siparişiniz iptal edildi.',
            'data' => $order->fresh(),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $customer = $request->user();

        $refunds = RefundRequest::where('customer_id', $customer->id)
            ->with('order:id,order_number,total,status')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $refunds]);
    }
}
