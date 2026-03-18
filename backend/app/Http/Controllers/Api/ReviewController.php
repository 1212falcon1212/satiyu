<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ReviewController extends Controller
{
    public function index(string $slug): JsonResponse
    {
        $product = Product::where('slug', $slug)->firstOrFail();

        $reviews = Review::where('product_id', $product->id)
            ->where('is_approved', true)
            ->with('customer')
            ->orderByDesc('created_at')
            ->paginate(10);

        $stats = [
            'average' => round(Review::where('product_id', $product->id)->where('is_approved', true)->avg('rating') ?? 0, 1),
            'count' => Review::where('product_id', $product->id)->where('is_approved', true)->count(),
        ];

        return response()->json([
            'data' => ReviewResource::collection($reviews)->response()->getData(true),
            'stats' => $stats,
        ]);
    }

    public function store(Request $request, string $slug): JsonResponse
    {
        $product = Product::where('slug', $slug)->firstOrFail();
        $customer = $request->user();

        $existing = Review::where('product_id', $product->id)
            ->where('customer_id', $customer->id)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Bu ürün için zaten bir yorumunuz var.',
            ], Response::HTTP_CONFLICT);
        }

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'title' => ['nullable', 'string', 'max:255'],
            'comment' => ['required', 'string', 'min:10', 'max:1000'],
            'order_id' => ['nullable', 'integer', 'exists:orders,id'],
        ]);

        if (isset($validated['order_id'])) {
            $order = Order::where('id', $validated['order_id'])
                ->where('customer_id', $customer->id)
                ->where('status', 'delivered')
                ->first();

            if (!$order) {
                return response()->json([
                    'message' => 'Geçersiz sipariş.',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        $review = Review::create([
            'product_id' => $product->id,
            'customer_id' => $customer->id,
            'order_id' => $validated['order_id'] ?? null,
            'rating' => $validated['rating'],
            'title' => $validated['title'] ?? null,
            'comment' => $validated['comment'],
            'is_approved' => false,
        ]);

        return (new ReviewResource($review))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }
}
