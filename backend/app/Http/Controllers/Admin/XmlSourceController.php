<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreXmlSourceRequest;
use App\Http\Resources\XmlImportLogResource;
use App\Http\Resources\XmlSourceResource;
use App\Jobs\XmlImportJob;
use App\Models\XmlImportLog;
use App\Models\XmlSource;
use App\Services\Xml\XmlImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpFoundation\Response;

class XmlSourceController extends Controller
{
    public function __construct(
        private readonly XmlImportService $importService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $sources = QueryBuilder::for(XmlSource::class)
            ->allowedFilters([
                AllowedFilter::partial('name'),
                AllowedFilter::exact('type'),
                AllowedFilter::exact('is_active'),
            ])
            ->allowedSorts(['name', 'created_at', 'last_synced_at'])
            ->defaultSort('-created_at')
            ->withCount('products')
            ->paginate($request->input('per_page', 15))
            ->appends($request->query());

        return response()->json(
            XmlSourceResource::collection($sources)->response()->getData(true),
        );
    }

    public function store(StoreXmlSourceRequest $request): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('file')) {
            $source = XmlSource::create(array_merge(
                collect($data)->except('file')->toArray(),
                ['url' => ''],
            ));

            $file = $request->file('file');
            $path = $file->storeAs("xml-sources/{$source->id}", $file->getClientOriginalName());
            $source->update(['url' => "file://{$path}"]);
        } else {
            $source = XmlSource::create(collect($data)->except('file')->toArray());
        }

        $source->loadCount('products');

        return response()->json([
            'data' => new XmlSourceResource($source),
        ], Response::HTTP_CREATED);
    }

    public function uploadFile(Request $request, int $id): JsonResponse
    {
        $source = XmlSource::findOrFail($id);

        $request->validate([
            'file' => ['required', 'file', 'max:51200'],
        ]);

        $file = $request->file('file');
        $path = $file->storeAs("xml-sources/{$source->id}", $file->getClientOriginalName());
        $source->update(['url' => "file://{$path}"]);

        return response()->json([
            'data' => new XmlSourceResource($source->fresh()->loadCount('products')),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $source = XmlSource::withCount('products')->findOrFail($id);

        return response()->json([
            'data' => new XmlSourceResource($source),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $source = XmlSource::findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'url' => ['sometimes', 'url', 'max:2048'],
            'type' => ['sometimes', 'in:supplier,custom'],
            'mapping_config' => ['nullable', 'array'],
            'auto_sync' => ['boolean'],
            'sync_interval' => ['nullable', 'in:hourly,daily,weekly,monthly'],
            'is_active' => ['boolean'],
        ]);

        $source->update($validated);

        return response()->json([
            'data' => new XmlSourceResource($source->fresh()->loadCount('products')),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $source = XmlSource::findOrFail($id);

        try {
            // Manually delete xml_products first to avoid any FK ordering issues
            $source->xmlProducts()->delete();
            $source->delete();
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('XML kaynak silme hatası', [
                'source_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Kaynak silinemedi: ' . $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'data' => ['message' => 'XML kaynağı silindi.'],
        ]);
    }

    public function import(Request $request, int $id): JsonResponse
    {
        $source = XmlSource::findOrFail($id);
        $cacheKey = XmlImportService::cacheKey($source->id);

        $filters = $request->validate([
            'product_indices' => ['nullable', 'array'],
            'product_indices.*' => ['integer', 'min:0'],
            'categories' => ['nullable', 'array'],
            'categories.*' => ['string'],
            'excluded_categories' => ['nullable', 'array'],
            'excluded_categories.*' => ['string'],
            'brands' => ['nullable', 'array'],
            'brands.*' => ['string'],
            'limit' => ['nullable', 'integer', 'min:1'],
            'price_adjustment_percent' => ['nullable', 'numeric', 'between:-99,999'],
        ]);

        // Remove null values
        $filters = array_filter($filters, fn ($v) => $v !== null);

        // Atomic lock to prevent duplicate job dispatch
        $lock = Cache::lock("xml_import_lock:{$source->id}", 10);
        if (!$lock->get()) {
            return response()->json([
                'data' => ['message' => 'Bu kaynak için zaten aktif bir import işlemi var.'],
            ], Response::HTTP_CONFLICT);
        }

        try {
            // Check for active import
            $progress = Cache::get($cacheKey);
            if ($progress && in_array($progress['status'] ?? null, ['queued', 'downloading', 'parsing', 'processing'])) {
                return response()->json([
                    'data' => ['message' => 'Bu kaynak için zaten aktif bir import işlemi var.'],
                ], Response::HTTP_CONFLICT);
            }

            // Set initial queued status
            Cache::put($cacheKey, [
                'status' => 'queued',
                'total' => 0,
                'processed' => 0,
                'created' => 0,
                'updated' => 0,
                'failed' => 0,
                'updated_at' => now()->toISOString(),
            ], 3600);

            XmlImportJob::dispatch($source->id, $filters);
        } finally {
            $lock->release();
        }

        return response()->json([
            'data' => ['message' => 'Import işlemi kuyruğa eklendi.'],
        ], Response::HTTP_ACCEPTED);
    }

    public function importProgress(int $id): JsonResponse
    {
        // Check cache first to avoid DB hit on every poll
        $cacheKey = XmlImportService::cacheKey($id);
        $progress = Cache::get($cacheKey);

        if ($progress) {
            return response()->json(['data' => $progress]);
        }

        // Validate source exists for fallback path
        XmlSource::findOrFail($id);

        // Fallback: check recent incomplete log
        $recentLog = XmlImportLog::where('xml_source_id', $id)
            ->whereNull('completed_at')
            ->where('started_at', '>=', now()->subMinutes(30))
            ->latest('started_at')
            ->first();

        if ($recentLog) {
            return response()->json([
                'data' => [
                    'status' => 'processing',
                    'total' => $recentLog->total_products,
                    'processed' => $recentLog->created + $recentLog->updated + $recentLog->failed,
                    'created' => $recentLog->created,
                    'updated' => $recentLog->updated,
                    'failed' => $recentLog->failed,
                ],
            ]);
        }

        return response()->json(['data' => ['status' => 'idle']]);
    }

    public function preparePreview(int $id): JsonResponse
    {
        $source = XmlSource::findOrFail($id);

        $result = $this->importService->preparePreview($source);

        return response()->json([
            'data' => $result,
        ]);
    }

    public function preview(Request $request, int $id): JsonResponse
    {
        $source = XmlSource::findOrFail($id);

        $page = (int) $request->query('page', 1);
        $perPage = (int) $request->query('per_page', 50);
        $category = $request->query('category');
        $brand = $request->query('brand');
        $excludedCategories = $request->query('excluded_categories', []);
        if (is_string($excludedCategories)) {
            $excludedCategories = json_decode($excludedCategories, true) ?? [];
        }

        $result = $this->importService->getPaginatedPreview($source, $page, $perPage, $category, $brand, $excludedCategories, true);

        return response()->json([
            'data' => $result,
        ]);
    }

    public function logs(int $id): JsonResponse
    {
        $source = XmlSource::findOrFail($id);

        $logs = $source->importLogs()
            ->orderByDesc('created_at')
            ->paginate(10);

        return response()->json(
            XmlImportLogResource::collection($logs)->response()->getData(true),
        );
    }

    public function updateMapping(Request $request, int $id): JsonResponse
    {
        $source = XmlSource::findOrFail($id);

        $validated = $request->validate([
            'mapping_config' => ['required', 'array'],
            'mapping_config.field_map' => ['nullable', 'array'],
            'mapping_config.product_node' => ['nullable', 'string'],
            'mapping_config.wrapper_node' => ['nullable', 'string'],
        ]);

        $source->update(['mapping_config' => $validated['mapping_config']]);

        return response()->json([
            'data' => new XmlSourceResource($source->fresh()->loadCount('products')),
        ]);
    }

    public function detectFields(int $id): JsonResponse
    {
        $source = XmlSource::findOrFail($id);

        $result = $this->importService->detectAvailableFieldsWithSamples($source);

        return response()->json([
            'data' => $result,
        ]);
    }
}
