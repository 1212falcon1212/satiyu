<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductVariantType;
use App\Models\ProductVariantValue;
use App\Models\VariantOption;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ProductService
{
    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return QueryBuilder::for(Product::class)
            ->allowedFilters([
                AllowedFilter::exact('category_id'),
                AllowedFilter::exact('brand_id'),
                AllowedFilter::exact('is_active'),
                AllowedFilter::exact('is_featured'),
                AllowedFilter::exact('is_new'),
                AllowedFilter::exact('stock_status'),
                AllowedFilter::scope('price_between', 'whereBetween'),
                AllowedFilter::partial('name'),
                AllowedFilter::partial('sku'),
            ])
            ->allowedSorts(['name', 'price', 'created_at', 'sort_order', 'stock_quantity'])
            ->allowedIncludes(['brand', 'category', 'images'])
            ->defaultSort('-created_at')
            ->with(['images', 'brand', 'category'])
            ->paginate($perPage)
            ->appends(request()->query());
    }

    public function getBySlug(string $slug): Product
    {
        return Product::where('slug', $slug)
            ->with([
                'brand',
                'category',
                'images' => fn ($q) => $q->orderBy('sort_order'),
                'variants.variantValues.variantOption.variantType',
                'variants.images',
                'attributes',
                'reviews',
            ])
            ->firstOrFail();
    }

    public function store(array $data): Product
    {
        return Product::create($data);
    }

    public function update(Product $product, array $data): Product
    {
        $product->update($data);
        return $product->fresh();
    }

    public function delete(Product $product): void
    {
        $product->delete();
    }

    public function generateVariants(int $productId, array $variantTypeIds, ?array $optionIds = null): void
    {
        DB::transaction(function () use ($productId, $variantTypeIds, $optionIds) {
            ProductVariantType::where('product_id', $productId)->delete();
            foreach ($variantTypeIds as $index => $typeId) {
                ProductVariantType::create([
                    'product_id' => $productId,
                    'variant_type_id' => $typeId,
                    'sort_order' => $index,
                ]);
            }

            $optionGroups = [];
            foreach ($variantTypeIds as $typeId) {
                $query = VariantOption::where('variant_type_id', $typeId)
                    ->orderBy('sort_order');
                if ($optionIds !== null) {
                    $query->whereIn('id', $optionIds);
                }
                $options = $query->get();
                if ($options->isNotEmpty()) {
                    $optionGroups[] = $options;
                }
            }

            if (empty($optionGroups)) {
                return;
            }

            $combinations = $this->cartesian($optionGroups);
            $product = Product::findOrFail($productId);

            foreach ($combinations as $index => $combination) {
                $skuParts = array_map(fn ($opt) => $opt->value, $combination);
                $variant = ProductVariant::create([
                    'product_id' => $productId,
                    'sku' => $product->sku ? $product->sku . '-' . implode('-', $skuParts) : null,
                    'price' => $product->price,
                    'stock_quantity' => 0,
                    'is_active' => true,
                    'sort_order' => $index,
                ]);

                foreach ($combination as $option) {
                    ProductVariantValue::create([
                        'product_variant_id' => $variant->id,
                        'variant_option_id' => $option->id,
                    ]);
                }
            }
        });
    }

    public function bulkUpdatePriceStock(array $items): void
    {
        DB::transaction(function () use ($items) {
            foreach ($items as $item) {
                $update = [];
                if (isset($item['price'])) {
                    $update['price'] = $item['price'];
                }
                if (isset($item['stock_quantity'])) {
                    $update['stock_quantity'] = $item['stock_quantity'];
                }
                if (!empty($update)) {
                    if (isset($item['variant_id'])) {
                        ProductVariant::where('id', $item['variant_id'])->update($update);
                    } elseif (isset($item['product_id'])) {
                        Product::where('id', $item['product_id'])->update($update);
                    }
                }
            }
        });
    }

    private function cartesian(array $groups): array
    {
        $result = [[]];

        foreach ($groups as $group) {
            $temp = [];
            foreach ($result as $existing) {
                foreach ($group as $option) {
                    $temp[] = array_merge($existing, [$option]);
                }
            }
            $result = $temp;
        }

        return $result;
    }
}
