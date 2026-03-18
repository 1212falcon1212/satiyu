<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BrandResource;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;

class BrandController extends Controller
{
    public function index(): JsonResponse
    {
        $brands = Brand::where('is_active', true)
            ->where('is_featured', true)
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => BrandResource::collection($brands),
        ]);
    }
}
