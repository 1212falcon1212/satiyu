<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMarketplaceCredentialRequest;
use App\Models\MarketplaceCredential;
use App\Services\Marketplace\CiceksepetiApiService;
use App\Services\Marketplace\HepsiburadaApiService;
use App\Services\Marketplace\TrendyolApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class MarketplaceCredentialController extends Controller
{
    public function index(string $marketplace): JsonResponse
    {
        $credential = MarketplaceCredential::where('marketplace', $marketplace)->first();

        if (!$credential) {
            return response()->json(['data' => null]);
        }

        return response()->json([
            'data' => [
                'id' => $credential->id,
                'marketplace' => $credential->marketplace,
                'apiKey' => '****' . substr($credential->api_key, -4),
                'sellerId' => $credential->seller_id,
                'supplierId' => $credential->supplier_id,
                'baseUrl' => $credential->base_url,
                'userAgent' => $credential->user_agent,
                'isActive' => $credential->is_active,
            ],
        ]);
    }

    public function store(StoreMarketplaceCredentialRequest $request, string $marketplace): JsonResponse
    {
        $validated = $request->validated();

        $credential = MarketplaceCredential::updateOrCreate(
            ['marketplace' => $marketplace],
            array_merge($validated, ['marketplace' => $marketplace, 'is_active' => true])
        );

        return response()->json([
            'message' => 'Kimlik bilgileri kaydedildi.',
            'data' => [
                'id' => $credential->id,
                'marketplace' => $credential->marketplace,
                'isActive' => $credential->is_active,
            ],
        ], Response::HTTP_CREATED);
    }

    public function update(StoreMarketplaceCredentialRequest $request, string $marketplace): JsonResponse
    {
        $credential = MarketplaceCredential::where('marketplace', $marketplace)->firstOrFail();

        $credential->update($request->validated());

        return response()->json([
            'message' => 'Kimlik bilgileri güncellendi.',
        ]);
    }

    public function testConnection(string $marketplace): JsonResponse
    {
        $credential = MarketplaceCredential::where('marketplace', $marketplace)->firstOrFail();

        $service = match ($marketplace) {
            'trendyol' => new TrendyolApiService($credential),
            'hepsiburada' => new HepsiburadaApiService($credential),
            'ciceksepeti' => new CiceksepetiApiService($credential),
            default => throw new \InvalidArgumentException('Geçersiz marketplace: ' . $marketplace),
        };

        $success = $service->testConnection();

        return response()->json([
            'success' => $success,
            'message' => $success ? 'Bağlantı başarılı.' : 'Bağlantı başarısız.',
        ]);
    }
}
