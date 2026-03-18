<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Support\Facades\DB;

class ImageService
{
    public function store(Product $product, array $images): void
    {
        $hasMain = $product->images()->where('is_main', true)->exists();

        foreach ($images as $index => $imageData) {
            $product->images()->create([
                'image_url' => $imageData['image_url'],
                'alt_text' => $imageData['alt_text'] ?? null,
                'sort_order' => $imageData['sort_order'] ?? $index,
                'is_main' => !$hasMain && $index === 0,
            ]);
        }
    }

    public function reorder(int $productId, array $order): void
    {
        DB::transaction(function () use ($productId, $order) {
            foreach ($order as $index => $imageId) {
                ProductImage::where('id', $imageId)
                    ->where('product_id', $productId)
                    ->update(['sort_order' => $index]);
            }
        });
    }

    public function setMain(int $imageId): void
    {
        $image = ProductImage::findOrFail($imageId);

        DB::transaction(function () use ($image) {
            ProductImage::where('product_id', $image->product_id)
                ->update(['is_main' => false]);

            $image->update(['is_main' => true]);
        });
    }

    public function delete(int $imageId): void
    {
        $image = ProductImage::findOrFail($imageId);
        $wasMain = $image->is_main;
        $productId = $image->product_id;

        $image->delete();

        if ($wasMain) {
            ProductImage::where('product_id', $productId)
                ->orderBy('sort_order')
                ->first()
                ?->update(['is_main' => true]);
        }
    }
}
