<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\SettingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*.key' => ['required', 'string', 'max:255'],
            'settings.*.value' => ['present'],
            'settings.*.group' => ['nullable', 'string', 'max:255'],
            'settings.*.type' => ['nullable', 'string', 'max:255'],
        ]);

        foreach ($validated['settings'] as $setting) {
            $this->settingService->set(
                $setting['key'],
                $setting['value'],
                $setting['group'] ?? 'general',
                $setting['type'] ?? 'text',
            );
        }

        $settings = $this->settingService->getAll();

        return response()->json([
            'data' => $settings,
        ]);
    }
}
