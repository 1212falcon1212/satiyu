<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBannerRequest;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BannerController extends Controller
{
    public function index(): JsonResponse
    {
        $banners = Banner::orderBy('position')
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'data' => $banners->map(fn (Banner $banner) => $this->transformBanner($banner)),
        ]);
    }

    public function store(StoreBannerRequest $request): JsonResponse
    {
        $banner = Banner::create($request->validated());

        return response()->json([
            'data' => $this->transformBanner($banner),
        ], Response::HTTP_CREATED);
    }

    public function show(int $id): JsonResponse
    {
        $banner = Banner::findOrFail($id);

        return response()->json([
            'data' => $this->transformBanner($banner),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $banner = Banner::findOrFail($id);

        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'image_url' => ['sometimes', 'string', 'max:500'],
            'mobile_image_url' => ['nullable', 'string', 'max:500'],
            'link_url' => ['nullable', 'string', 'max:255'],
            'button_text' => ['nullable', 'string', 'max:100'],
            'title_color' => ['nullable', 'string', 'max:7'],
            'subtitle_color' => ['nullable', 'string', 'max:7'],
            'button_color' => ['nullable', 'string', 'max:7'],
            'position' => ['sometimes', 'string', 'max:255'],
            'sort_order' => ['integer', 'min:0'],
            'is_active' => ['boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
        ]);

        $banner->update($validated);

        return response()->json([
            'data' => $this->transformBanner($banner->fresh()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $banner = Banner::findOrFail($id);
        $banner->delete();

        return response()->json([
            'data' => [
                'message' => 'Banner deleted successfully.',
            ],
        ]);
    }

    private function transformBanner(Banner $banner): array
    {
        return [
            'id' => $banner->id,
            'title' => $banner->title,
            'subtitle' => $banner->subtitle,
            'imageUrl' => $banner->image_url,
            'mobileImageUrl' => $banner->mobile_image_url,
            'linkUrl' => $banner->link_url,
            'buttonText' => $banner->button_text,
            'titleColor' => $banner->title_color ?? '#FFFFFF',
            'subtitleColor' => $banner->subtitle_color ?? '#FFFFFF',
            'buttonColor' => $banner->button_color ?? '#FFFFFF',
            'position' => $banner->position,
            'sortOrder' => $banner->sort_order,
            'isActive' => $banner->is_active,
            'startsAt' => $banner->starts_at?->toIso8601String(),
            'endsAt' => $banner->ends_at?->toIso8601String(),
            'createdAt' => $banner->created_at?->toIso8601String(),
        ];
    }
}
