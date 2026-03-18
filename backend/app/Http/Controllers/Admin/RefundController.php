<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\RefundRequest;
use App\Services\PayTRService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RefundController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = RefundRequest::with(['order:id,order_number,total,status,payment_method,payment_status', 'customer:id,name,email']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->whereHas('order', fn ($oq) => $oq->where('order_number', 'like', "%{$search}%"))
                  ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'like', "%{$search}%"));
            });
        }

        $refunds = $query->orderByDesc('created_at')->paginate(20);

        return response()->json($refunds);
    }

    public function show(RefundRequest $refundRequest): JsonResponse
    {
        $refundRequest->load([
            'order.items.product.images',
            'order.customer',
            'customer',
        ]);

        $data = $refundRequest->toArray();
        $data['order'] = $refundRequest->order ? (new OrderResource($refundRequest->order))->resolve() : null;

        return response()->json(['data' => $data]);
    }

    public function approve(RefundRequest $refundRequest): JsonResponse
    {
        if ($refundRequest->status !== 'pending') {
            return response()->json(['message' => 'Sadece bekleyen talepler onaylanabilir.'], 422);
        }

        $order = $refundRequest->order;

        if ($order->payment_method === 'credit_card') {
            $paytrService = app(PayTRService::class);
            $result = $paytrService->processRefund($order, (string) $refundRequest->refund_amount);

            if (! $result['success']) {
                return response()->json(['message' => $result['message']], 422);
            }

            $refundRequest->update([
                'status' => 'approved',
                'paytr_reference' => $result['merchant_oid'] ?? null,
            ]);
        } else {
            $refundRequest->update([
                'status' => 'approved',
            ]);
        }

        $order->update(['payment_status' => 'refunded']);

        // Stok iadesi
        $order->load('items');
        foreach ($order->items as $item) {
            if ($item->product_variant_id) {
                ProductVariant::where('id', $item->product_variant_id)
                    ->increment('stock_quantity', $item->quantity);
            } elseif ($item->product_id) {
                Product::where('id', $item->product_id)
                    ->increment('stock_quantity', $item->quantity);
            }
        }

        return response()->json(['message' => 'İade talebi onaylandı.', 'data' => $refundRequest->fresh()]);
    }

    public function reject(Request $request, RefundRequest $refundRequest): JsonResponse
    {
        if ($refundRequest->status !== 'pending') {
            return response()->json(['message' => 'Sadece bekleyen talepler reddedilebilir.'], 422);
        }

        $request->validate([
            'admin_note' => 'required|string|max:1000',
        ]);

        $refundRequest->update([
            'status' => 'rejected',
            'admin_note' => $request->admin_note,
        ]);

        return response()->json(['message' => 'İade talebi reddedildi.', 'data' => $refundRequest->fresh()]);
    }
}
