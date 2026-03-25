<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\CategoryTreeResource;
use App\Models\Category;
use App\Models\MarketplaceCategoryMapping;
use App\Models\Product;
use App\Models\XmlCategoryMapping;
use App\Services\CategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class CategoryController extends Controller
{
    public function __construct(
        private readonly CategoryService $categoryService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        // Flat mode: return all categories in tree-traversal order (for select dropdowns)
        if ($request->boolean('flat')) {
            $roots = Category::whereNull('parent_id')
                ->with(['children' => fn ($q) => $q->orderBy('sort_order')->with(['children' => fn ($q2) => $q2->orderBy('sort_order')])])
                ->orderBy('sort_order')
                ->get();

            $flat = collect();
            foreach ($roots as $root) {
                $flat->push($root);
                foreach ($root->children as $child) {
                    $flat->push($child);
                    foreach ($child->children as $grandchild) {
                        $flat->push($grandchild);
                    }
                }
            }

            return response()->json([
                'data' => CategoryResource::collection($flat),
            ]);
        }

        // Tree mode: return hierarchical nested structure
        $categories = Category::whereNull('parent_id')
            ->with(['children' => function ($query) {
                $query->orderBy('sort_order')
                    ->with(['children' => function ($q) {
                        $q->orderBy('sort_order');
                    }]);
            }])
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'data' => CategoryTreeResource::collection($categories),
        ]);
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $category = $this->categoryService->store($request->validated());

        return response()->json([
            'data' => new CategoryResource($category),
        ], Response::HTTP_CREATED);
    }

    public function show(int $id): JsonResponse
    {
        $category = Category::with(['children', 'parent'])->findOrFail($id);

        return response()->json([
            'data' => new CategoryResource($category),
        ]);
    }

    public function update(UpdateCategoryRequest $request, int $id): JsonResponse
    {
        $category = Category::findOrFail($id);
        $category = $this->categoryService->update($category, $request->validated());

        return response()->json([
            'data' => new CategoryResource($category),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $category = Category::findOrFail($id);

        if ($category->children()->exists()) {
            return response()->json([
                'message' => 'Cannot delete category with subcategories. Remove or reassign children first.',
            ], Response::HTTP_CONFLICT);
        }

        if ($category->products()->exists()) {
            return response()->json([
                'message' => 'Cannot delete category with products. Remove or reassign products first.',
            ], Response::HTTP_CONFLICT);
        }

        $this->categoryService->delete($category);

        return response()->json([
            'data' => [
                'message' => 'Category deleted successfully.',
            ],
        ]);
    }

    /**
     * Kaynak kategoriyi hedef kategoriye birleştirir.
     * Ürünler, alt kategoriler, marketplace ve XML mappingleri taşınır, kaynak silinir.
     */
    public function merge(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source_id' => ['required', 'integer', 'exists:categories,id'],
            'target_id' => ['required', 'integer', 'exists:categories,id', 'different:source_id'],
        ]);

        $sourceId = $validated['source_id'];
        $targetId = $validated['target_id'];

        $source = Category::findOrFail($sourceId);
        $target = Category::findOrFail($targetId);

        // Hedef, kaynağın alt kategorisi olamaz
        if ($target->path && str_contains($target->path, (string) $sourceId)) {
            return response()->json([
                'message' => 'Hedef kategori, kaynak kategorinin alt kategorisi olamaz.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        DB::transaction(function () use ($sourceId, $targetId) {
            // 1. Ürünleri taşı
            Product::where('category_id', $sourceId)->update(['category_id' => $targetId]);

            // 2. Alt kategorileri taşı
            Category::where('parent_id', $sourceId)->update(['parent_id' => $targetId]);

            // 3. Marketplace category mappinglerini aktar (hedefte yoksa)
            $existingMarketplaceMappings = MarketplaceCategoryMapping::where('local_category_id', $targetId)
                ->pluck('marketplace')
                ->toArray();

            MarketplaceCategoryMapping::where('local_category_id', $sourceId)
                ->whereNotIn('marketplace', $existingMarketplaceMappings)
                ->update(['local_category_id' => $targetId]);

            // Hedefte zaten olan marketplace'ler için kaynaktakileri sil
            MarketplaceCategoryMapping::where('local_category_id', $sourceId)->delete();

            // 4. XML category mappinglerini güncelle
            XmlCategoryMapping::where('local_category_id', $sourceId)
                ->update(['local_category_id' => $targetId]);

            // 5. Kaynak kategoriyi sil
            Category::where('id', $sourceId)->delete();
        });

        // Ürün sayılarını güncelle
        $this->categoryService->updateProductCounts();

        return response()->json([
            'message' => "'{$source->name}' kategorisi '{$target->name}' ile birleştirildi.",
            'merged_source' => $source->name,
            'merged_target' => $target->name,
        ]);
    }

    /**
     * Birleştirme önizlemesi: kaç ürün, alt kategori ve mapping etkilenecek.
     */
    public function mergePreview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source_id' => ['required', 'integer', 'exists:categories,id'],
            'target_id' => ['required', 'integer', 'exists:categories,id', 'different:source_id'],
        ]);

        $source = Category::withCount(['products', 'children'])->findOrFail($validated['source_id']);
        $target = Category::findOrFail($validated['target_id']);

        $marketplaceMappings = MarketplaceCategoryMapping::where('local_category_id', $source->id)->count();
        $xmlMappings = XmlCategoryMapping::where('local_category_id', $source->id)->count();

        return response()->json([
            'source' => ['id' => $source->id, 'name' => $source->name],
            'target' => ['id' => $target->id, 'name' => $target->name],
            'affected' => [
                'products' => $source->products_count,
                'children' => $source->children_count,
                'marketplace_mappings' => $marketplaceMappings,
                'xml_mappings' => $xmlMappings,
            ],
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $request->validate([
            'items' => ['required', 'array'],
            'items.*.id' => ['required', 'integer', 'exists:categories,id'],
            'items.*.sort_order' => ['required', 'integer', 'min:0'],
            'items.*.parent_id' => ['nullable', 'integer', 'exists:categories,id'],
        ]);

        $this->categoryService->reorder($request->input('items'));

        return response()->json([
            'data' => [
                'message' => 'Categories reordered successfully.',
            ],
        ]);
    }
}
