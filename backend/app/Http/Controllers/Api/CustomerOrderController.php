<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\CheckoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class CustomerOrderController extends Controller
{
    public function __construct(
        private CheckoutService $checkoutService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $orders = Order::where('customer_id', $request->user()->id)
            ->with(['items.product.images'])
            ->orderByDesc('created_at')
            ->paginate(10);

        return OrderResource::collection($orders);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'address_id' => ['required', 'integer', 'exists:addresses,id'],
            'payment_method' => ['required', 'string', 'in:cash_on_delivery,bank_transfer,credit_card'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $sessionId = $request->header('X-Session-Id', '');

        $order = $this->checkoutService->createOrder(
            $request->user(),
            $validated,
            $sessionId,
        );

        return (new OrderResource($order))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Request $request, Order $order): OrderResource
    {
        abort_unless($order->customer_id === $request->user()->id, 403);

        $order->load(['items.product.images']);

        return new OrderResource($order);
    }

    public function uploadReceipt(Request $request, Order $order): JsonResponse
    {
        abort_unless($request->user()->id === $order->customer_id, 403);
        abort_unless($order->payment_method === 'bank_transfer', 422, 'Bu sipariş havale ile ödenmedi.');
        abort_unless(!$order->payment_receipt, 422, 'Dekont zaten yüklendi.');

        $request->validate([
            'receipt' => ['required', 'file', 'mimes:jpeg,jpg,png,pdf', 'max:5120'],
        ]);

        $path = $request->file('receipt')->store('receipts', 'public');
        $order->update(['payment_receipt' => $path]);

        return response()->json([
            'message' => 'Dekont başarıyla yüklendi.',
            'data' => new OrderResource($order),
        ]);
    }
}
