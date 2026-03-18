<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVariantTypeRequest;
use App\Http\Resources\VariantTypeResource;
use App\Models\VariantOption;
use App\Models\VariantType;
use App\Services\VariantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VariantTypeController extends Controller
{
    public function __construct(
        private readonly VariantService $variantService,
    ) {}

    public function index(): JsonResponse
    {
        $types = $this->variantService->allTypes();

        return response()->json([
            'data' => VariantTypeResource::collection($types),
        ]);
    }

    public function store(StoreVariantTypeRequest $request): JsonResponse
    {
        $type = $this->variantService->storeType($request->validated());

        return response()->json([
            'data' => new VariantTypeResource($type),
        ], Response::HTTP_CREATED);
    }

    public function show(int $id): JsonResponse
    {
        $type = $this->variantService->getType($id);

        return response()->json([
            'data' => new VariantTypeResource($type),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $type = VariantType::findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'display_type' => ['sometimes', 'in:color_swatch,button,dropdown'],
            'sort_order' => ['integer', 'min:0'],
        ]);

        $type = $this->variantService->updateType($type, $validated);

        return response()->json([
            'data' => new VariantTypeResource($type),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $type = VariantType::findOrFail($id);
        $this->variantService->deleteType($type);

        return response()->json([
            'data' => [
                'message' => 'Variant type deleted successfully.',
            ],
        ]);
    }

    public function storeOption(Request $request, int $variantTypeId): JsonResponse
    {
        $type = VariantType::findOrFail($variantTypeId);

        $validated = $request->validate([
            'value' => ['required', 'string', 'max:255'],
            'color_code' => ['nullable', 'string', 'max:7'],
            'image_url' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['integer', 'min:0'],
        ]);

        $option = $this->variantService->storeOption($type, $validated);

        return response()->json([
            'data' => [
                'id' => $option->id,
                'value' => $option->value,
                'colorCode' => $option->color_code,
                'imageUrl' => $option->image_url,
                'sortOrder' => $option->sort_order,
            ],
        ], Response::HTTP_CREATED);
    }

    public function updateOption(Request $request, int $variantTypeId, int $optionId): JsonResponse
    {
        VariantType::findOrFail($variantTypeId);
        $option = VariantOption::where('id', $optionId)
            ->where('variant_type_id', $variantTypeId)
            ->firstOrFail();

        $validated = $request->validate([
            'value' => ['sometimes', 'string', 'max:255'],
            'color_code' => ['nullable', 'string', 'max:7'],
            'image_url' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['integer', 'min:0'],
        ]);

        $option = $this->variantService->updateOption($option, $validated);

        return response()->json([
            'data' => [
                'id' => $option->id,
                'value' => $option->value,
                'colorCode' => $option->color_code,
                'imageUrl' => $option->image_url,
                'sortOrder' => $option->sort_order,
            ],
        ]);
    }

    public function destroyOption(int $variantTypeId, int $optionId): JsonResponse
    {
        VariantType::findOrFail($variantTypeId);
        $option = VariantOption::where('id', $optionId)
            ->where('variant_type_id', $variantTypeId)
            ->firstOrFail();

        $this->variantService->deleteOption($option);

        return response()->json([
            'data' => [
                'message' => 'Variant option deleted successfully.',
            ],
        ]);
    }
}
