<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\CategoryTreeResource;
use App\Models\Category;
use App\Services\CategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
