<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TrustBadge;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TrustBadgeController extends Controller
{
    public function index(): JsonResponse
    {
        $badges = TrustBadge::orderBy('sort_order')->get();

        return response()->json([
            'data' => $badges->map(fn (TrustBadge $badge) => $this->transform($badge)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'icon' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'sort_order' => ['integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $badge = TrustBadge::create($validated);

        return response()->json([
            'data' => $this->transform($badge),
        ], Response::HTTP_CREATED);
    }

    public function show(int $id): JsonResponse
    {
        $badge = TrustBadge::findOrFail($id);

        return response()->json([
            'data' => $this->transform($badge),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $badge = TrustBadge::findOrFail($id);

        $validated = $request->validate([
            'icon' => ['sometimes', 'string', 'max:255'],
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'sort_order' => ['integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $badge->update($validated);

        return response()->json([
            'data' => $this->transform($badge->fresh()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $badge = TrustBadge::findOrFail($id);
        $badge->delete();

        return response()->json([
            'data' => [
                'message' => 'Trust badge deleted successfully.',
            ],
        ]);
    }

    private function transform(TrustBadge $badge): array
    {
        return [
            'id' => $badge->id,
            'icon' => $badge->icon,
            'title' => $badge->title,
            'description' => $badge->description,
            'sortOrder' => $badge->sort_order,
            'isActive' => $badge->is_active,
            'createdAt' => $badge->created_at?->toIso8601String(),
        ];
    }
}
