<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\XmlProduct;
use App\Models\XmlSource;
use App\Services\Xml\XmlBulkOperationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class XmlBulkOperationController extends Controller
{
    public function __construct(
        private readonly XmlBulkOperationService $bulkService,
    ) {}

    public function xmlProducts(Request $request, int $sourceId): JsonResponse
    {
        $source = XmlSource::findOrFail($sourceId);

        $query = XmlProduct::where('xml_source_id', $source->id)
            ->with('product:id,name,sku,barcode,price,compare_price,stock_quantity');

        if ($request->filled('sync_status')) {
            $query->where('sync_status', $request->input('sync_status'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('external_sku', 'like', "%{$search}%")
                    ->orWhere('external_name', 'like', "%{$search}%");
            });
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        $paginated = $query->orderByDesc('last_seen_at')->paginate($perPage);

        return response()->json([
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function comparison(int $sourceId): JsonResponse
    {
        $source = XmlSource::findOrFail($sourceId);

        $total = XmlProduct::where('xml_source_id', $source->id)->count();
        $matched = XmlProduct::where('xml_source_id', $source->id)->whereNotNull('local_product_id')->count();
        $unmatched = $total - $matched;
        $withChanges = XmlProduct::where('xml_source_id', $source->id)
            ->whereNotNull('changes_detected')
            ->where('changes_detected', '!=', '[]')
            ->where('changes_detected', '!=', 'null')
            ->count();

        return response()->json([
            'data' => [
                'total' => $total,
                'matched' => $matched,
                'unmatched' => $unmatched,
                'with_changes' => $withChanges,
            ],
        ]);
    }

    public function barcodeSuffix(Request $request, int $sourceId): JsonResponse
    {
        $request->validate([
            'suffix' => 'required|string|max:50',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer',
        ]);

        $source = XmlSource::findOrFail($sourceId);
        $result = $this->bulkService->bulkModifyBarcodeSuffix(
            $source,
            $request->input('suffix'),
            $request->input('product_ids', []),
        );

        return response()->json(['data' => $result, 'message' => 'Barkod suffix uygulandı.']);
    }

    public function skuSuffix(Request $request, int $sourceId): JsonResponse
    {
        $request->validate([
            'suffix' => 'required|string|max:50',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer',
        ]);

        $source = XmlSource::findOrFail($sourceId);
        $result = $this->bulkService->bulkModifySkuSuffix(
            $source,
            $request->input('suffix'),
            $request->input('product_ids', []),
        );

        return response()->json(['data' => $result, 'message' => 'SKU suffix uygulandı.']);
    }

    public function nameModify(Request $request, int $sourceId): JsonResponse
    {
        $request->validate([
            'mode' => 'required|in:prefix,suffix',
            'value' => 'required|string|max:100',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer',
        ]);

        $source = XmlSource::findOrFail($sourceId);
        $result = $this->bulkService->bulkModifyProductName(
            $source,
            $request->input('mode'),
            $request->input('value'),
            $request->input('product_ids', []),
        );

        return response()->json(['data' => $result, 'message' => 'Ürün isimleri güncellendi.']);
    }

    public function priceAdjust(Request $request, int $sourceId): JsonResponse
    {
        $request->validate([
            'type' => 'required|in:percentage,fixed',
            'value' => 'required|numeric',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer',
        ]);

        $source = XmlSource::findOrFail($sourceId);
        $result = $this->bulkService->bulkAdjustPrices(
            $source,
            $request->input('type'),
            (float) $request->input('value'),
            $request->input('product_ids', []),
        );

        return response()->json(['data' => $result, 'message' => 'Fiyatlar güncellendi.']);
    }

    public function history(int $sourceId): JsonResponse
    {
        $source = XmlSource::findOrFail($sourceId);
        $history = $this->bulkService->getHistory($source);

        return response()->json(['data' => $history]);
    }

    public function revert(int $sourceId, int $logId): JsonResponse
    {
        XmlSource::findOrFail($sourceId);
        $result = $this->bulkService->revert($logId);

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], 422);
        }

        return response()->json(['data' => $result, 'message' => 'İşlem geri alındı.']);
    }

    public function preview(Request $request, int $sourceId): JsonResponse
    {
        $request->validate([
            'operation' => 'required|in:barcode_suffix,sku_suffix,name_modify,price_adjust',
            'params' => 'required|array',
            'limit' => 'nullable|integer|min:1|max:50',
        ]);

        $source = XmlSource::findOrFail($sourceId);
        $result = $this->bulkService->previewBulkChanges(
            $source,
            $request->input('operation'),
            $request->input('params'),
            $request->input('limit', 10),
        );

        return response()->json(['data' => $result]);
    }
}
