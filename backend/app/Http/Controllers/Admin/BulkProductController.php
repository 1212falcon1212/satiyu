<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BulkProductController extends Controller
{
    /**
     * List products with search/filter for bulk operations.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::query()
            ->select(['id', 'name', 'sku', 'barcode', 'price', 'stock_quantity', 'brand_id', 'category_id'])
            ->with(['brand:id,name', 'category:id,name']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->input('brand_id'));
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        $paginated = $query->orderByDesc('id')->paginate($perPage);

        $items = collect($paginated->items())->map(fn ($p) => [
            'id' => $p->id,
            'name' => $p->name,
            'sku' => $p->sku,
            'barcode' => $p->barcode,
            'price' => (float) $p->price,
            'stock_quantity' => $p->stock_quantity,
            'brand_name' => $p->brand?->name,
            'category_name' => $p->category?->name,
        ]);

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Append "-{suffix}" to product barcodes. Idempotent.
     */
    public function barcodeSuffix(Request $request): JsonResponse
    {
        $request->validate([
            'suffix' => 'required|string|max:50',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer',
        ]);

        $suffixPart = '-' . $request->input('suffix');
        $stats = ['products_updated' => 0, 'variants_updated' => 0, 'skipped' => 0];

        $query = Product::query();
        if (!empty($request->input('product_ids'))) {
            $query->whereIn('id', $request->input('product_ids'));
        }

        $query->chunkById(100, function ($products) use ($suffixPart, &$stats) {
            foreach ($products as $product) {
                if (!$product->barcode || str_ends_with($product->barcode, $suffixPart)) {
                    $stats['skipped']++;
                    continue;
                }

                $product->update(['barcode' => $product->barcode . $suffixPart]);
                $stats['products_updated']++;

                $this->updateVariantField($product->id, 'barcode', $suffixPart, 'suffix', $stats);
            }
        });

        return response()->json(['data' => $stats, 'message' => 'Barkod suffix uygulandı.']);
    }

    /**
     * Prepend "{prefix}-" to product barcodes. Idempotent.
     */
    public function barcodePrefix(Request $request): JsonResponse
    {
        $request->validate([
            'prefix' => 'required|string|max:50',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer',
        ]);

        $prefixPart = $request->input('prefix') . '-';
        $stats = ['products_updated' => 0, 'variants_updated' => 0, 'skipped' => 0];

        $query = Product::query();
        if (!empty($request->input('product_ids'))) {
            $query->whereIn('id', $request->input('product_ids'));
        }

        $query->chunkById(100, function ($products) use ($prefixPart, &$stats) {
            foreach ($products as $product) {
                if (!$product->barcode || str_starts_with($product->barcode, $prefixPart)) {
                    $stats['skipped']++;
                    continue;
                }

                $product->update(['barcode' => $prefixPart . $product->barcode]);
                $stats['products_updated']++;

                $this->updateVariantField($product->id, 'barcode', $prefixPart, 'prefix', $stats);
            }
        });

        return response()->json(['data' => $stats, 'message' => 'Barkod prefix uygulandı.']);
    }

    /**
     * Append "-{suffix}" to product SKUs. Idempotent.
     */
    public function skuSuffix(Request $request): JsonResponse
    {
        $request->validate([
            'suffix' => 'required|string|max:50',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer',
        ]);

        $suffixPart = '-' . $request->input('suffix');
        $stats = ['products_updated' => 0, 'variants_updated' => 0, 'skipped' => 0];

        $query = Product::query();
        if (!empty($request->input('product_ids'))) {
            $query->whereIn('id', $request->input('product_ids'));
        }

        $query->chunkById(100, function ($products) use ($suffixPart, &$stats) {
            foreach ($products as $product) {
                if (!$product->sku || str_ends_with($product->sku, $suffixPart)) {
                    $stats['skipped']++;
                    continue;
                }

                $product->update(['sku' => $product->sku . $suffixPart]);
                $stats['products_updated']++;

                $this->updateVariantField($product->id, 'sku', $suffixPart, 'suffix', $stats);
            }
        });

        return response()->json(['data' => $stats, 'message' => 'SKU suffix uygulandı.']);
    }

    /**
     * Prepend "{prefix}-" to product SKUs. Idempotent.
     */
    public function skuPrefix(Request $request): JsonResponse
    {
        $request->validate([
            'prefix' => 'required|string|max:50',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer',
        ]);

        $prefixPart = $request->input('prefix') . '-';
        $stats = ['products_updated' => 0, 'variants_updated' => 0, 'skipped' => 0];

        $query = Product::query();
        if (!empty($request->input('product_ids'))) {
            $query->whereIn('id', $request->input('product_ids'));
        }

        $query->chunkById(100, function ($products) use ($prefixPart, &$stats) {
            foreach ($products as $product) {
                if (!$product->sku || str_starts_with($product->sku, $prefixPart)) {
                    $stats['skipped']++;
                    continue;
                }

                $product->update(['sku' => $prefixPart . $product->sku]);
                $stats['products_updated']++;

                $this->updateVariantField($product->id, 'sku', $prefixPart, 'prefix', $stats);
            }
        });

        return response()->json(['data' => $stats, 'message' => 'SKU prefix uygulandı.']);
    }

    /**
     * Add prefix or suffix to product names. Regenerates slugs. Idempotent.
     */
    public function nameModify(Request $request): JsonResponse
    {
        $request->validate([
            'mode' => 'required|in:prefix,suffix',
            'value' => 'required|string|max:100',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer',
        ]);

        $mode = $request->input('mode');
        $value = $request->input('value');
        $stats = ['products_updated' => 0, 'skipped' => 0];

        $query = Product::query();
        if (!empty($request->input('product_ids'))) {
            $query->whereIn('id', $request->input('product_ids'));
        }

        $query->chunkById(100, function ($products) use ($mode, $value, &$stats) {
            foreach ($products as $product) {
                if ($mode === 'prefix' && str_starts_with($product->name, $value . ' ')) {
                    $stats['skipped']++;
                    continue;
                }
                if ($mode === 'suffix' && str_ends_with($product->name, ' ' . $value)) {
                    $stats['skipped']++;
                    continue;
                }

                $newName = $mode === 'prefix'
                    ? $value . ' ' . $product->name
                    : $product->name . ' ' . $value;

                $product->update([
                    'name' => $newName,
                    'slug' => Str::slug($newName) . '-' . $product->id,
                ]);
                $stats['products_updated']++;
            }
        });

        return response()->json(['data' => $stats, 'message' => 'Ürün isimleri güncellendi.']);
    }

    /**
     * Preview changes before applying.
     */
    public function preview(Request $request): JsonResponse
    {
        $request->validate([
            'operation' => 'required|in:barcode_suffix,barcode_prefix,sku_suffix,sku_prefix,name_modify',
            'params' => 'required|array',
            'limit' => 'nullable|integer|min:1|max:50',
        ]);

        $operation = $request->input('operation');
        $params = $request->input('params');
        $limit = $request->input('limit', 10);

        $query = Product::query();
        if (!empty($params['product_ids'])) {
            $query->whereIn('id', $params['product_ids']);
        }

        $products = $query->limit($limit)->get();
        $previews = [];

        foreach ($products as $product) {
            $preview = [
                'id' => $product->id,
                'name' => $product->name,
                'before' => [],
                'after' => [],
            ];

            switch ($operation) {
                case 'barcode_suffix':
                    $suffixPart = '-' . ($params['suffix'] ?? '');
                    $preview['before']['barcode'] = $product->barcode;
                    $preview['after']['barcode'] = ($product->barcode && !str_ends_with($product->barcode, $suffixPart))
                        ? $product->barcode . $suffixPart
                        : $product->barcode;
                    break;

                case 'barcode_prefix':
                    $prefixPart = ($params['prefix'] ?? '') . '-';
                    $preview['before']['barcode'] = $product->barcode;
                    $preview['after']['barcode'] = ($product->barcode && !str_starts_with($product->barcode, $prefixPart))
                        ? $prefixPart . $product->barcode
                        : $product->barcode;
                    break;

                case 'sku_suffix':
                    $suffixPart = '-' . ($params['suffix'] ?? '');
                    $preview['before']['sku'] = $product->sku;
                    $preview['after']['sku'] = ($product->sku && !str_ends_with($product->sku, $suffixPart))
                        ? $product->sku . $suffixPart
                        : $product->sku;
                    break;

                case 'sku_prefix':
                    $prefixPart = ($params['prefix'] ?? '') . '-';
                    $preview['before']['sku'] = $product->sku;
                    $preview['after']['sku'] = ($product->sku && !str_starts_with($product->sku, $prefixPart))
                        ? $prefixPart . $product->sku
                        : $product->sku;
                    break;

                case 'name_modify':
                    $nameMode = $params['mode'] ?? 'prefix';
                    $nameVal = $params['value'] ?? '';
                    $preview['before']['name'] = $product->name;
                    if ($nameMode === 'prefix' && !str_starts_with($product->name, $nameVal . ' ')) {
                        $preview['after']['name'] = $nameVal . ' ' . $product->name;
                    } elseif ($nameMode === 'suffix' && !str_ends_with($product->name, ' ' . $nameVal)) {
                        $preview['after']['name'] = $product->name . ' ' . $nameVal;
                    } else {
                        $preview['after']['name'] = $product->name;
                    }
                    break;
            }

            $previews[] = $preview;
        }

        return response()->json(['data' => $previews]);
    }

    /**
     * Update variant field (barcode or sku) with prefix or suffix.
     */
    private function updateVariantField(int $productId, string $field, string $part, string $mode, array &$stats): void
    {
        $variants = ProductVariant::where('product_id', $productId)
            ->whereNotNull($field)
            ->where($field, '!=', '')
            ->get();

        foreach ($variants as $variant) {
            if ($mode === 'suffix' && str_ends_with($variant->{$field}, $part)) {
                continue;
            }
            if ($mode === 'prefix' && str_starts_with($variant->{$field}, $part)) {
                continue;
            }

            $newValue = $mode === 'prefix'
                ? $part . $variant->{$field}
                : $variant->{$field} . $part;

            $variant->update([$field => $newValue]);
            $stats['variants_updated']++;
        }
    }
}
