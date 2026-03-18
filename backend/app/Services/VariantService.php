<?php

namespace App\Services;

use App\Models\ProductVariant;
use App\Models\ProductVariantType;
use App\Models\ProductVariantValue;
use App\Models\VariantOption;
use App\Models\VariantType;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class VariantService
{
    public function allTypes(): Collection
    {
        return VariantType::with('variantOptions')->orderBy('sort_order')->get();
    }

    public function getType(int $id): VariantType
    {
        return VariantType::with('variantOptions')->findOrFail($id);
    }

    public function storeType(array $data): VariantType
    {
        return DB::transaction(function () use ($data) {
            $options = $data['options'] ?? [];
            unset($data['options']);

            $type = VariantType::create($data);

            foreach ($options as $index => $option) {
                $type->variantOptions()->create(array_merge($option, [
                    'sort_order' => $option['sort_order'] ?? $index,
                ]));
            }

            return $type->load('variantOptions');
        });
    }

    public function updateType(VariantType $type, array $data): VariantType
    {
        $type->update($data);
        return $type->fresh()->load('variantOptions');
    }

    public function deleteType(VariantType $type): void
    {
        $type->delete();
    }

    public function storeOption(VariantType $type, array $data): VariantOption
    {
        return $type->variantOptions()->create($data);
    }

    public function updateOption(VariantOption $option, array $data): VariantOption
    {
        $option->update($data);
        return $option->fresh();
    }

    public function deleteOption(VariantOption $option): void
    {
        $option->delete();
    }

    public function generateCombinations(int $productId): void
    {
        DB::transaction(function () use ($productId) {
            ProductVariant::where('product_id', $productId)->delete();

            $productVariantTypes = ProductVariantType::where('product_id', $productId)
                ->orderBy('sort_order')
                ->with('variantType.variantOptions')
                ->get();

            $optionGroups = [];
            foreach ($productVariantTypes as $pvt) {
                $options = $pvt->variantType->variantOptions->sortBy('sort_order');
                if ($options->isNotEmpty()) {
                    $optionGroups[] = $options;
                }
            }

            if (empty($optionGroups)) {
                return;
            }

            $combinations = [[]];
            foreach ($optionGroups as $group) {
                $temp = [];
                foreach ($combinations as $existing) {
                    foreach ($group as $option) {
                        $temp[] = array_merge($existing, [$option]);
                    }
                }
                $combinations = $temp;
            }

            foreach ($combinations as $index => $combination) {
                $variant = ProductVariant::create([
                    'product_id' => $productId,
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
}
