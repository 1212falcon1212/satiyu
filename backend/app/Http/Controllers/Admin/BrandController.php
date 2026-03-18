<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBrandRequest;
use App\Http\Resources\BrandResource;
use App\Models\Brand;
use App\Services\BrandService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpFoundation\Response;

class BrandController extends Controller
{
    public function __construct(
        private readonly BrandService $brandService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $brands = QueryBuilder::for(Brand::class)
            ->allowedFilters([
                AllowedFilter::partial('name'),
                AllowedFilter::exact('is_active'),
                AllowedFilter::exact('is_featured'),
            ])
            ->allowedSorts(['name', 'created_at'])
            ->defaultSort('name')
            ->paginate($request->input('per_page', 15))
            ->appends($request->query());

        return response()->json(
            BrandResource::collection($brands)->response()->getData(true),
        );
    }

    public function store(StoreBrandRequest $request): JsonResponse
    {
        $brand = $this->brandService->store($request->validated());

        return response()->json([
            'data' => new BrandResource($brand),
        ], Response::HTTP_CREATED);
    }

    public function show(int $id): JsonResponse
    {
        $brand = $this->brandService->getById($id);

        return response()->json([
            'data' => new BrandResource($brand),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $brand = Brand::findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', 'unique:brands,slug,' . $id],
            'logo_url' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
            'is_featured' => ['boolean'],
        ]);

        $brand = $this->brandService->update($brand, $validated);

        return response()->json([
            'data' => new BrandResource($brand),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $brand = Brand::findOrFail($id);
        $this->brandService->delete($brand);

        return response()->json([
            'data' => [
                'message' => 'Brand deleted successfully.',
            ],
        ]);
    }
}
