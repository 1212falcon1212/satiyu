<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BannerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Banner::active()->inDateRange();

        if ($request->filled('position')) {
            $query->position($request->input('position'));
        }

        $banners = $query
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'data' => $banners->map(fn (Banner $banner) => [
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
            ]),
        ]);
    }
}
