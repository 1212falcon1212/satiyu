<?php

namespace App\Services;

use App\Models\Category;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class CategoryService
{
    public function getTree(): Collection
    {
        return Category::where('is_active', true)
            ->whereNull('parent_id')
            ->with(['children' => function ($query) {
                $query->where('is_active', true)
                    ->orderBy('sort_order')
                    ->with(['children' => function ($q) {
                        $q->where('is_active', true)->orderBy('sort_order');
                    }]);
            }])
            ->orderBy('sort_order')
            ->get();
    }

    public function getBySlug(string $slug): ?Category
    {
        return Category::where('slug', $slug)
            ->with(['children' => function ($query) {
                $query->where('is_active', true)->orderBy('sort_order');
            }])
            ->firstOrFail();
    }

    public function getCategoryWithAncestors(Category $category): array
    {
        $ancestors = [];

        if ($category->path) {
            $ids = explode('/', $category->path);
            $ancestors = Category::whereIn('id', $ids)
                ->orderByRaw('FIELD(id, ' . implode(',', $ids) . ')')
                ->get()
                ->toArray();
        }

        $ancestors[] = $category->toArray();

        return $ancestors;
    }

    public function reorder(array $items): void
    {
        DB::transaction(function () use ($items) {
            foreach ($items as $item) {
                Category::where('id', $item['id'])->update([
                    'sort_order' => $item['sort_order'],
                    'parent_id' => $item['parent_id'] ?? null,
                ]);
            }
        });
    }

    public function updateProductCounts(): void
    {
        // Direct product count per category
        DB::statement('
            UPDATE categories SET product_count = (
                SELECT COUNT(*) FROM products
                WHERE products.category_id = categories.id
                AND products.is_active = 1
                AND products.deleted_at IS NULL
            )
        ');

        // Add children counts to parent categories (bottom-up)
        $maxDepth = (int) DB::selectOne('SELECT MAX(depth) as d FROM categories')?->d;
        for ($depth = $maxDepth - 1; $depth >= 0; $depth--) {
            DB::statement("
                UPDATE categories p
                INNER JOIN (
                    SELECT parent_id, SUM(product_count) as child_sum
                    FROM categories
                    WHERE parent_id IS NOT NULL
                    GROUP BY parent_id
                ) c ON c.parent_id = p.id
                SET p.product_count = p.product_count + c.child_sum
                WHERE p.depth = ?
            ", [$depth]);
        }
    }

    public function store(array $data): Category
    {
        return Category::create($data);
    }

    public function update(Category $category, array $data): Category
    {
        $category->update($data);
        return $category->fresh();
    }

    public function delete(Category $category): void
    {
        $category->children()->update(['parent_id' => $category->parent_id]);
        $category->delete();
    }
}
