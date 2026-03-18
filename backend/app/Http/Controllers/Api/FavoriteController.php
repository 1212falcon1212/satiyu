<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductListResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $customer = $request->user();

        $products = $customer->favorites()
            ->where('is_active', true)
            ->with(['images', 'brand', 'category'])
            ->orderByPivot('created_at', 'desc')
            ->paginate($request->input('per_page', 15))
            ->appends($request->query());

        return response()->json(
            ProductListResource::collection($products)->response()->getData(true),
        );
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => 'required|integer|exists:products,id',
        ]);

        $customer = $request->user();
        $productId = $request->input('product_id');

        $exists = $customer->favorites()->where('product_id', $productId)->exists();

        if ($exists) {
            $customer->favorites()->detach($productId);
            return response()->json(['favorited' => false]);
        }

        $customer->favorites()->attach($productId);
        return response()->json(['favorited' => true]);
    }

    public function destroy(Request $request, int $productId): JsonResponse
    {
        $customer = $request->user();
        $customer->favorites()->detach($productId);

        return response()->json(['favorited' => false]);
    }

    public function check(Request $request): JsonResponse
    {
        $customer = $request->user();

        $favoriteIds = $customer->favorites()->pluck('products.id')->toArray();

        return response()->json(['data' => $favoriteIds]);
    }
}
