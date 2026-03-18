<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\PayTRService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Log;

class OrderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Order::with(['customer', 'items']);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->input('payment_status'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $orders = $query->orderByDesc('created_at')->paginate(20);

        return OrderResource::collection($orders);
    }

    public function show(Order $order): OrderResource
    {
        $order->load(['customer', 'items.product.images']);

        return new OrderResource($order);
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:pending,confirmed,preparing,shipped,delivered,cancelled'],
        ]);

        $previousStatus = $order->status;
        $newStatus = $validated['status'];

        // Restore stock on cancellation
        if ($newStatus === 'cancelled' && $previousStatus !== 'cancelled') {
            foreach ($order->items as $item) {
                if ($item->product_variant_id) {
                    ProductVariant::where('id', $item->product_variant_id)
                        ->increment('stock_quantity', $item->quantity);
                } elseif ($item->product_id) {
                    Product::where('id', $item->product_id)
                        ->increment('stock_quantity', $item->quantity);
                }
            }

            // Kredi kartı ile ödenmişse PayTR iade
            if ($order->payment_status === 'paid' && $order->payment_method === 'credit_card') {
                $paytrService = app(PayTRService::class);
                $result = $paytrService->processRefund($order, (string) $order->total);

                if ($result['success']) {
                    $order->update(['status' => $newStatus, 'payment_status' => 'refunded']);
                    Log::info('Admin order cancelled with PayTR refund', ['order' => $order->order_number]);

                    return response()->json([
                        'data' => new OrderResource($order->load(['customer', 'items'])),
                        'message' => 'Sipariş iptal edildi ve ödeme iade edildi.',
                    ]);
                } else {
                    Log::error('Admin cancel PayTR refund failed', ['order' => $order->order_number, 'message' => $result['message']]);
                    return response()->json(['message' => 'PayTR iade başarısız: ' . $result['message']], 422);
                }
            }
        }

        $order->update(['status' => $newStatus]);

        return response()->json([
            'data' => new OrderResource($order->load(['customer', 'items'])),
            'message' => 'Sipariş durumu güncellendi.',
        ]);
    }

    public function approvePayment(Order $order): JsonResponse
    {
        abort_unless($order->payment_method === 'bank_transfer', 422);
        abort_unless($order->payment_receipt, 422, 'Dekont yüklenmemiş.');

        $order->update([
            'payment_status' => 'paid',
            'status' => 'confirmed',
        ]);

        return response()->json([
            'message' => 'Ödeme onaylandı, sipariş onaylandı.',
            'data' => new OrderResource($order->load(['customer', 'items.product'])),
        ]);
    }
}
