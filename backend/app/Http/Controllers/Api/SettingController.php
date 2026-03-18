<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SettingService;
use Illuminate\Http\JsonResponse;

class SettingController extends Controller
{
    public function __construct(
        private readonly SettingService $settingService,
    ) {}

    public function index(): JsonResponse
    {
        $settings = $this->settingService->getAll();

        return response()->json([
            'data' => $settings,
        ]);
    }
}
