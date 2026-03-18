<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TrustBadge;
use Illuminate\Http\JsonResponse;

class TrustBadgeController extends Controller
{
    public function index(): JsonResponse
    {
        $badges = TrustBadge::active()
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'data' => $badges->map(fn (TrustBadge $badge) => [
                'id' => $badge->id,
                'icon' => $badge->icon,
                'title' => $badge->title,
                'description' => $badge->description,
                'sortOrder' => $badge->sort_order,
            ]),
        ]);
    }
}
