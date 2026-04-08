<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Customer::withCount('orders')
            ->withSum('orders', 'total');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $isActive = $request->input('status') === 'active';
            $query->where('is_active', $isActive);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        $customers = $query->orderByDesc('created_at')->paginate(20);

        $customers->getCollection()->transform(function ($customer) {
            return [
                'id' => $customer->id,
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'isActive' => $customer->is_active,
                'createdAt' => $customer->created_at,
                'ordersCount' => $customer->orders_count,
                'totalSpent' => (float) ($customer->orders_sum_total ?? 0),
            ];
        });

        return response()->json($customers);
    }

    public function show(Customer $customer): JsonResponse
    {
        $customer->loadCount('orders');
        $customer->loadSum('orders', 'total');
        $customer->load([
            'orders' => fn ($q) => $q->with('items')->latest()->take(10),
            'addresses',
            'reviews.product',
        ]);

        return response()->json([
            'data' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'isActive' => $customer->is_active,
                'createdAt' => $customer->created_at,
                'ordersCount' => $customer->orders_count,
                'totalSpent' => (float) ($customer->orders_sum_total ?? 0),
                'orders' => $customer->orders->map(fn ($order) => [
                    'id' => $order->id,
                    'orderNumber' => $order->order_number,
                    'status' => $order->status,
                    'paymentStatus' => $order->payment_status,
                    'total' => $order->total,
                    'createdAt' => $order->created_at,
                    'itemsCount' => $order->items->count(),
                ]),
                'addresses' => $customer->addresses->map(fn ($address) => [
                    'id' => $address->id,
                    'title' => $address->title,
                    'fullName' => $address->full_name,
                    'phone' => $address->phone,
                    'city' => $address->city,
                    'district' => $address->district,
                    'neighborhood' => $address->neighborhood,
                    'addressLine' => $address->address_line,
                    'postalCode' => $address->postal_code,
                    'isDefault' => $address->is_default,
                ]),
                'reviews' => $customer->reviews->map(fn ($review) => [
                    'id' => $review->id,
                    'rating' => $review->rating,
                    'title' => $review->title,
                    'comment' => $review->comment,
                    'isApproved' => $review->is_approved,
                    'createdAt' => $review->created_at,
                    'product' => $review->product ? [
                        'id' => $review->product->id,
                        'name' => $review->product->name,
                        'slug' => $review->product->slug,
                    ] : null,
                ]),
            ],
        ]);
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['sometimes', 'boolean'],
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', 'unique:customers,email,' . $customer->id],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'password' => ['nullable', 'string', 'min:6'],
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = bcrypt($validated['password']);
        }

        $customer->update($validated);

        return response()->json([
            'data' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'isActive' => $customer->is_active,
                'createdAt' => $customer->created_at,
            ],
            'message' => 'Müşteri bilgileri güncellendi.',
        ]);
    }
}
