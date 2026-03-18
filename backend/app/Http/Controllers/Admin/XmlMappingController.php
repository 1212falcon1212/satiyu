<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\XmlBrandMapping;
use App\Models\XmlCategoryMapping;
use App\Models\XmlPriceRule;
use App\Models\XmlSource;
use App\Services\Xml\XmlPricingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class XmlMappingController extends Controller
{
    // ── Category Mappings ──

    public function categoryMappings(int $sourceId): JsonResponse
    {
        $source = XmlSource::findOrFail($sourceId);
        $mappings = $source->categoryMappings()
            ->with('localCategory')
            ->orderBy('xml_category_path')
            ->get();

        return response()->json(['data' => $mappings]);
    }

    public function storeCategoryMapping(Request $request, int $sourceId): JsonResponse
    {
        $source = XmlSource::findOrFail($sourceId);

        $validated = $request->validate([
            'xml_category_path' => ['required', 'string', 'max:500'],
            'local_category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'create_if_missing' => ['boolean'],
        ]);

        $mapping = $source->categoryMappings()->updateOrCreate(
            ['xml_category_path' => $validated['xml_category_path']],
            collect($validated)->except('xml_category_path')->toArray(),
        );

        $mapping->load('localCategory');

        return response()->json(['data' => $mapping], 201);
    }

    public function batchCategoryMappings(Request $request, int $sourceId): JsonResponse
    {
        $source = XmlSource::findOrFail($sourceId);

        $validated = $request->validate([
            'mappings' => ['required', 'array'],
            'mappings.*.xml_category_path' => ['required', 'string', 'max:500'],
            'mappings.*.local_category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'mappings.*.create_if_missing' => ['boolean'],
        ]);

        $results = [];
        foreach ($validated['mappings'] as $item) {
            $results[] = $source->categoryMappings()->updateOrCreate(
                ['xml_category_path' => $item['xml_category_path']],
                collect($item)->except('xml_category_path')->toArray(),
            );
        }

        return response()->json(['data' => $results]);
    }

    public function destroyCategoryMapping(int $sourceId, int $mappingId): JsonResponse
    {
        $mapping = XmlCategoryMapping::where('xml_source_id', $sourceId)
            ->findOrFail($mappingId);
        $mapping->delete();

        return response()->json(['data' => ['message' => 'Kategori eşleştirmesi silindi.']]);
    }

    // ── Brand Mappings ──

    public function brandMappings(int $sourceId): JsonResponse
    {
        $source = XmlSource::findOrFail($sourceId);
        $mappings = $source->brandMappings()
            ->with('localBrand')
            ->orderBy('xml_brand_name')
            ->get();

        return response()->json(['data' => $mappings]);
    }

    public function storeBrandMapping(Request $request, int $sourceId): JsonResponse
    {
        $source = XmlSource::findOrFail($sourceId);

        $validated = $request->validate([
            'xml_brand_name' => ['required', 'string', 'max:255'],
            'local_brand_name' => ['nullable', 'string', 'max:255'],
            'local_brand_id' => ['nullable', 'integer', 'exists:brands,id'],
        ]);

        $mapping = $source->brandMappings()->updateOrCreate(
            ['xml_brand_name' => $validated['xml_brand_name']],
            collect($validated)->except('xml_brand_name')->toArray(),
        );

        $mapping->load('localBrand');

        return response()->json(['data' => $mapping], 201);
    }

    public function batchBrandMappings(Request $request, int $sourceId): JsonResponse
    {
        $source = XmlSource::findOrFail($sourceId);

        $validated = $request->validate([
            'mappings' => ['required', 'array'],
            'mappings.*.xml_brand_name' => ['required', 'string', 'max:255'],
            'mappings.*.local_brand_name' => ['nullable', 'string', 'max:255'],
            'mappings.*.local_brand_id' => ['nullable', 'integer', 'exists:brands,id'],
        ]);

        $results = [];
        foreach ($validated['mappings'] as $item) {
            $results[] = $source->brandMappings()->updateOrCreate(
                ['xml_brand_name' => $item['xml_brand_name']],
                collect($item)->except('xml_brand_name')->toArray(),
            );
        }

        return response()->json(['data' => $results]);
    }

    public function destroyBrandMapping(int $sourceId, int $mappingId): JsonResponse
    {
        $mapping = XmlBrandMapping::where('xml_source_id', $sourceId)
            ->findOrFail($mappingId);
        $mapping->delete();

        return response()->json(['data' => ['message' => 'Marka eşleştirmesi silindi.']]);
    }

    // ── Price Rules ──

    public function priceRules(int $sourceId): JsonResponse
    {
        $source = XmlSource::findOrFail($sourceId);
        $rules = $source->priceRules()
            ->orderByDesc('priority')
            ->get();

        return response()->json(['data' => $rules]);
    }

    public function storePriceRule(Request $request, int $sourceId): JsonResponse
    {
        $source = XmlSource::findOrFail($sourceId);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:percentage,fixed'],
            'value' => ['required', 'numeric'],
            'apply_to' => ['required', 'in:all,category,brand'],
            'apply_to_value' => ['nullable', 'string', 'max:500'],
            'rounding_type' => ['nullable', 'in:none,round_99,round_90,round_up,round_down'],
            'include_vat' => ['boolean'],
            'is_active' => ['boolean'],
            'priority' => ['integer', 'min:0'],
        ]);

        $rule = $source->priceRules()->create($validated);

        return response()->json(['data' => $rule], 201);
    }

    public function updatePriceRule(Request $request, int $sourceId, int $ruleId): JsonResponse
    {
        $rule = XmlPriceRule::where('xml_source_id', $sourceId)
            ->findOrFail($ruleId);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'type' => ['sometimes', 'in:percentage,fixed'],
            'value' => ['sometimes', 'numeric'],
            'apply_to' => ['sometimes', 'in:all,category,brand'],
            'apply_to_value' => ['nullable', 'string', 'max:500'],
            'rounding_type' => ['nullable', 'in:none,round_99,round_90,round_up,round_down'],
            'include_vat' => ['boolean'],
            'is_active' => ['boolean'],
            'priority' => ['integer', 'min:0'],
        ]);

        $rule->update($validated);

        return response()->json(['data' => $rule->fresh()]);
    }

    public function destroyPriceRule(int $sourceId, int $ruleId): JsonResponse
    {
        $rule = XmlPriceRule::where('xml_source_id', $sourceId)
            ->findOrFail($ruleId);
        $rule->delete();

        return response()->json(['data' => ['message' => 'Fiyat kuralı silindi.']]);
    }

    public function previewPrices(Request $request, int $sourceId, XmlPricingService $pricingService): JsonResponse
    {
        $source = XmlSource::findOrFail($sourceId);

        $previewPath = "xml-preview/{$source->id}.json";
        if (!\Illuminate\Support\Facades\Storage::exists($previewPath)) {
            return response()->json(['data' => ['products' => [], 'message' => 'Önizleme verisi bulunamadı. Önce preview hazırlayın.']], 404);
        }

        $products = json_decode(\Illuminate\Support\Facades\Storage::get($previewPath), true);
        $limit = min((int) $request->query('limit', 20), 100);
        $products = array_slice($products, 0, $limit);

        $result = $pricingService->previewPrices($source, $products);

        return response()->json(['data' => ['products' => $result]]);
    }

    // ── Barcode Settings ──

    public function updateBarcodeSettings(Request $request, int $sourceId): JsonResponse
    {
        $source = XmlSource::findOrFail($sourceId);

        $validated = $request->validate([
            'barcode_prefix' => ['nullable', 'string', 'max:20'],
            'barcode_regenerate' => ['boolean'],
        ]);

        $source->update($validated);

        return response()->json(['data' => $source->fresh()]);
    }
}
