<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HomepageSection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class HomepageSectionController extends Controller
{
    public function index(): JsonResponse
    {
        $sections = HomepageSection::orderBy('sort_order')->get();

        return response()->json([
            'data' => $sections->map(fn (HomepageSection $s) => [
                'id' => $s->id,
                'type' => $s->type,
                'title' => $s->title,
                'subtitle' => $s->subtitle,
                'config' => $s->config,
                'sortOrder' => $s->sort_order,
                'isActive' => $s->is_active,
                'createdAt' => $s->created_at?->toIso8601String(),
                'updatedAt' => $s->updated_at?->toIso8601String(),
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|string|max:50',
            'title' => 'nullable|string|max:255',
            'subtitle' => 'nullable|string|max:255',
            'config' => 'nullable|array',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        if (!isset($validated['sort_order'])) {
            $validated['sort_order'] = (HomepageSection::max('sort_order') ?? -1) + 1;
        }

        $section = HomepageSection::create($validated);
        $this->clearCache();

        return response()->json([
            'data' => $this->formatSection($section),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $section = HomepageSection::findOrFail($id);

        return response()->json([
            'data' => $this->formatSection($section),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $section = HomepageSection::findOrFail($id);

        $validated = $request->validate([
            'type' => 'sometimes|string|max:50',
            'title' => 'nullable|string|max:255',
            'subtitle' => 'nullable|string|max:255',
            'config' => 'nullable|array',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $section->update($validated);
        $this->clearCache();

        return response()->json([
            'data' => $this->formatSection($section->fresh()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $section = HomepageSection::findOrFail($id);
        $section->delete();
        $this->clearCache();

        return response()->json(['message' => 'Bölüm silindi.']);
    }

    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|integer|exists:homepage_sections,id',
            'items.*.sort_order' => 'required|integer',
        ]);

        foreach ($validated['items'] as $item) {
            HomepageSection::where('id', $item['id'])->update([
                'sort_order' => $item['sort_order'],
            ]);
        }

        $this->clearCache();

        return response()->json(['message' => 'Sıralama güncellendi.']);
    }

    private function clearCache(): void
    {
        Cache::forget('homepage_sections');
    }

    private function formatSection(HomepageSection $s): array
    {
        return [
            'id' => $s->id,
            'type' => $s->type,
            'title' => $s->title,
            'subtitle' => $s->subtitle,
            'config' => $s->config,
            'sortOrder' => $s->sort_order,
            'isActive' => $s->is_active,
            'createdAt' => $s->created_at?->toIso8601String(),
            'updatedAt' => $s->updated_at?->toIso8601String(),
        ];
    }
}
