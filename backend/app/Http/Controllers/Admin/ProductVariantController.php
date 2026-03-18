<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductVariantResource;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\ProductService;
use App\Services\VariantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ProductVariantController extends Controller
{
    public function __construct(
        private readonly ProductService $productService,
        private readonly VariantService $variantService,
    ) {}

    public function index(int $productId): JsonResponse
    {
        $product = Product::findOrFail($productId);

        $variants = $product->variants()
            ->with(['variantValues.variantOption.variantType', 'images'])
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'data' => ProductVariantResource::collection($variants),
        ]);
    }

    public function generate(Request $request, int $productId): JsonResponse
    {
        Product::findOrFail($productId);

        $validated = $request->validate([
            'variant_type_ids' => ['required', 'array', 'min:1'],
            'variant_type_ids.*' => ['required', 'integer', 'exists:variant_types,id'],
            'variant_option_ids' => ['nullable', 'array'],
            'variant_option_ids.*' => ['integer', 'exists:variant_options,id'],
        ]);

        $optionIds = $validated['variant_option_ids'] ?? null;
        $this->productService->generateVariants($productId, $validated['variant_type_ids'], $optionIds);

        $variants = ProductVariant::where('product_id', $productId)
            ->with(['variantValues.variantOption.variantType', 'images'])
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'data' => ProductVariantResource::collection($variants),
        ], Response::HTTP_CREATED);
    }

    public function bulkUpdate(Request $request, int $productId): JsonResponse
    {
        Product::findOrFail($productId);

        $validated = $request->validate([
            'variants' => ['required', 'array', 'min:1'],
            'variants.*.id' => ['required', 'integer', 'exists:product_variants,id'],
            'variants.*.price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.compare_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.cost_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.stock_quantity' => ['nullable', 'integer', 'min:0'],
            'variants.*.sku' => ['nullable', 'string', 'max:255'],
            'variants.*.barcode' => ['nullable', 'string', 'max:255'],
            'variants.*.weight' => ['nullable', 'numeric', 'min:0'],
            'variants.*.is_active' => ['nullable', 'boolean'],
        ]);

        foreach ($validated['variants'] as $variantData) {
            $variantId = $variantData['id'];
            unset($variantData['id']);

            ProductVariant::where('id', $variantId)
                ->where('product_id', $productId)
                ->update($variantData);
        }

        $variants = ProductVariant::where('product_id', $productId)
            ->with(['variantValues.variantOption.variantType', 'images'])
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'data' => ProductVariantResource::collection($variants),
        ]);
    }

    public function store(int $productId, Request $request): JsonResponse
    {
        Product::findOrFail($productId);

        $validated = $request->validate([
            'variant_option_ids' => ['required', 'array', 'min:1'],
            'variant_option_ids.*' => ['required', 'integer', 'exists:variant_options,id'],
        ]);

        // Determine sort order
        $maxSort = ProductVariant::where('product_id', $productId)->max('sort_order') ?? -1;

        $variant = ProductVariant::create([
            'product_id' => $productId,
            'price' => null,
            'compare_price' => null,
            'cost_price' => null,
            'stock_quantity' => 0,
            'is_active' => true,
            'sort_order' => $maxSort + 1,
        ]);

        foreach ($validated['variant_option_ids'] as $optionId) {
            \App\Models\ProductVariantValue::create([
                'product_variant_id' => $variant->id,
                'variant_option_id' => $optionId,
            ]);
        }

        $variant->load(['variantValues.variantOption.variantType', 'images']);

        return response()->json([
            'data' => new ProductVariantResource($variant),
        ], Response::HTTP_CREATED);
    }

    public function update(Request $request, int $productId, int $variantId): JsonResponse
    {
        $variant = ProductVariant::where('id', $variantId)
            ->where('product_id', $productId)
            ->firstOrFail();

        $validated = $request->validate([
            'price' => ['nullable', 'numeric', 'min:0'],
            'compare_price' => ['nullable', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'stock_quantity' => ['nullable', 'integer', 'min:0'],
            'sku' => ['nullable', 'string', 'max:255'],
            'barcode' => ['nullable', 'string', 'max:255'],
            'weight' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $variant->update($validated);
        $variant->load(['variantValues.variantOption.variantType', 'images']);

        return response()->json([
            'data' => new ProductVariantResource($variant),
        ]);
    }

    public function destroy(int $productId, int $variantId): JsonResponse
    {
        $variant = ProductVariant::where('id', $variantId)
            ->where('product_id', $productId)
            ->firstOrFail();

        $variant->delete();

        return response()->json([
            'data' => [
                'message' => 'Variant deleted successfully.',
            ],
        ]);
    }
}
