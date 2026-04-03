<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\MenuItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class MenuController extends Controller
{
    public function index(): JsonResponse
    {
        $items = MenuItem::withoutGlobalScope('ordered')
            ->with('category:id,name,slug')
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'data' => $items->map(fn (MenuItem $item) => $this->formatItem($item)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'label' => 'required|string|max:255',
            'type' => 'required|string|in:category,custom_link',
            'category_id' => 'required_if:type,category|nullable|integer|exists:categories,id',
            'url' => 'required_if:type,custom_link|nullable|string|max:2048',
            'open_new_tab' => 'nullable|boolean',
            'parent_id' => 'nullable|integer|exists:menu_items,id',
            'sort_order' => 'nullable|integer',
            'depth' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        if (!isset($validated['sort_order'])) {
            $validated['sort_order'] = (MenuItem::withoutGlobalScope('ordered')->max('sort_order') ?? -1) + 1;
        }

        $item = MenuItem::create($validated);
        $this->clearCache();

        return response()->json([
            'data' => $this->formatItem($item->load('category:id,name,slug')),
        ], 201);
    }

    public function show(MenuItem $menuItem): JsonResponse
    {
        return response()->json([
            'data' => $this->formatItem($menuItem->load('category:id,name,slug')),
        ]);
    }

    public function update(Request $request, MenuItem $menuItem): JsonResponse
    {
        $validated = $request->validate([
            'label' => 'sometimes|string|max:255',
            'type' => 'sometimes|string|in:category,custom_link',
            'category_id' => 'nullable|integer|exists:categories,id',
            'url' => 'nullable|string|max:2048',
            'open_new_tab' => 'nullable|boolean',
            'parent_id' => 'nullable|integer',
            'sort_order' => 'nullable|integer',
            'depth' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $menuItem->update($validated);
        $this->clearCache();

        return response()->json([
            'data' => $this->formatItem($menuItem->fresh()->load('category:id,name,slug')),
        ]);
    }

    public function destroy(MenuItem $menuItem): JsonResponse
    {
        $menuItem->delete();
        $this->clearCache();

        return response()->json(['message' => 'Menü öğesi silindi.']);
    }

    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|integer|exists:menu_items,id',
            'items.*.sort_order' => 'required|integer',
            'items.*.parent_id' => 'nullable|integer',
            'items.*.depth' => 'nullable|integer',
        ]);

        foreach ($validated['items'] as $item) {
            MenuItem::withoutGlobalScope('ordered')
                ->where('id', $item['id'])
                ->update([
                    'sort_order' => $item['sort_order'],
                    'parent_id' => $item['parent_id'] ?? null,
                    'depth' => $item['depth'] ?? 0,
                ]);
        }

        $this->clearCache();

        return response()->json(['message' => 'Sıralama güncellendi.']);
    }

    public function syncFromCategories(): JsonResponse
    {
        $existingCategoryIds = MenuItem::withoutGlobalScope('ordered')
            ->where('type', 'category')
            ->whereNotNull('category_id')
            ->pluck('category_id')
            ->toArray();

        $maxOrder = MenuItem::withoutGlobalScope('ordered')->max('sort_order') ?? -1;
        $added = 0;

        $rootCategories = Category::whereNull('parent_id')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->with(['children' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')])
            ->get();

        foreach ($rootCategories as $category) {
            if (in_array($category->id, $existingCategoryIds)) {
                continue;
            }

            $maxOrder++;
            $parentItem = MenuItem::create([
                'label' => $category->name,
                'type' => 'category',
                'category_id' => $category->id,
                'parent_id' => null,
                'depth' => 0,
                'sort_order' => $maxOrder,
                'is_active' => true,
            ]);
            $added++;

            // Alt kategorileri de ekle
            foreach ($category->children as $child) {
                if (in_array($child->id, $existingCategoryIds)) {
                    continue;
                }

                $maxOrder++;
                MenuItem::create([
                    'label' => $child->name,
                    'type' => 'category',
                    'category_id' => $child->id,
                    'parent_id' => $parentItem->id,
                    'depth' => 1,
                    'sort_order' => $maxOrder,
                    'is_active' => true,
                ]);
                $added++;
            }
        }

        $this->clearCache();

        return response()->json([
            'message' => "{$added} kategori menüye eklendi.",
            'added' => $added,
        ]);
    }

    private function clearCache(): void
    {
        Cache::forget('menu_items');
    }

    private function formatItem(MenuItem $item): array
    {
        return [
            'id' => $item->id,
            'parentId' => $item->parent_id,
            'label' => $item->label,
            'type' => $item->type,
            'categoryId' => $item->category_id,
            'categoryName' => $item->category?->name,
            'categorySlug' => $item->category?->slug,
            'url' => $item->url,
            'openNewTab' => $item->open_new_tab,
            'sortOrder' => $item->sort_order,
            'depth' => $item->depth ?? 0,
            'isActive' => $item->is_active,
        ];
    }
}
