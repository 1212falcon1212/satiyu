<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Review::with(['customer', 'product']);

        if ($request->filled('is_approved')) {
            $query->where('is_approved', filter_var($request->input('is_approved'), FILTER_VALIDATE_BOOLEAN));
        }

        $reviews = $query->orderByDesc('created_at')->paginate(20);

        return response()->json(
            ReviewResource::collection($reviews)->response()->getData(true)
        );
    }

    public function approve(Review $review): JsonResponse
    {
        $review->update(['is_approved' => true]);

        return response()->json(['message' => 'Yorum onaylandı.']);
    }

    public function reject(Review $review): JsonResponse
    {
        $review->update(['is_approved' => false]);

        return response()->json(['message' => 'Yorum reddedildi.']);
    }

    public function destroy(Review $review): JsonResponse
    {
        $review->delete();

        return response()->json(null, 204);
    }
}
