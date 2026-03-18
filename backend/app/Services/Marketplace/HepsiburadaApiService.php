<?php

namespace App\Services\Marketplace;

use App\Models\MarketplaceCategory;
use App\Models\MarketplaceCredential;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class HepsiburadaApiService extends MarketplaceService
{
    protected int $timeout = 120;
    protected int $rateLimitRequests = 500;
    protected int $rateLimitSeconds = 1;

    protected string $listingBaseUrl = 'https://listing-external.hepsiburada.com';

    public function __construct(MarketplaceCredential $credential)
    {
        parent::__construct($credential);
    }

    protected function getDefaultBaseUrl(): string
    {
        return 'https://mpop.hepsiburada.com';
    }

    // ==========================================
    // KATEGORI
    // ==========================================

    public function syncCategories(): int
    {
        $page = 0;
        $size = 2000;
        $totalSynced = 0;

        Log::info('HepsiBurada kategori senk başladı');

        while (true) {
            $result = $this->fetchCategoriesPage($page, $size);
            $categories = $result['categories'];

            if (empty($categories)) {
                break;
            }

            $this->upsertCategories($categories);
            $totalSynced += count($categories);

            if ($result['last']) {
                break;
            }

            $page++;
            usleep(100000); // 100ms
        }

        Log::info('HepsiBurada kategori senk tamamlandı', ['count' => $totalSynced]);

        return $totalSynced;
    }

    /**
     * Tek sayfa kategori verisini API'den ceker.
     *
     * @return array{categories: array, last: bool, totalPages: int, totalElements: int}
     */
    public function fetchCategoriesPage(int $page, int $size = 1000): array
    {
        $response = $this->makeRequest('get', '/product/api/categories/get-all-categories', [
            'query' => [
                'status' => 'ACTIVE',
                'available' => 'true',
                'type' => 'HB',
                'version' => 1,
                'page' => $page,
                'size' => $size,
            ],
        ]);

        if (!$response->successful()) {
            throw new \RuntimeException('HepsiBurada kategorileri alınamadı: ' . $response->body());
        }

        $json = $response->json();

        return [
            'categories' => $json['data'] ?? [],
            'last' => $json['last'] ?? true,
            'totalPages' => $json['totalPages'] ?? 1,
            'totalElements' => $json['totalElements'] ?? 0,
        ];
    }

    /**
     * Kategorileri toplu upsert ile veritabanına yazar.
     */
    public function upsertCategories(array $categories): int
    {
        $now = now();
        $chunks = array_chunk($categories, 500);
        $total = 0;

        foreach ($chunks as $chunk) {
            $rows = array_map(fn(array $category) => [
                'marketplace' => 'hepsiburada',
                'marketplace_category_id' => $category['categoryId'],
                'category_name' => $category['name'] ?? '',
                'parent_id' => $category['parentCategoryId'] ?? null,
                'last_synced_at' => $now,
                'updated_at' => $now,
                'created_at' => $now,
            ], $chunk);

            MarketplaceCategory::upsert(
                $rows,
                ['marketplace', 'marketplace_category_id'],
                ['category_name', 'parent_id', 'last_synced_at', 'updated_at']
            );

            $total += count($chunk);
        }

        return $total;
    }

    public function getCategoryAttributes(int $categoryId): array
    {
        $response = $this->makeRequest('get', "/product/api/categories/{$categoryId}/attributes", [
            'query' => ['version' => 2],
        ]);

        if ($response->successful()) {
            $json = $response->json();

            if (isset($json['success']) && $json['success'] === false) {
                return [
                    'success' => false,
                    'categoryId' => $categoryId,
                    'baseAttributes' => [],
                    'attributes' => [],
                    'variantAttributes' => [],
                ];
            }

            $data = $json['data'] ?? $json;

            return [
                'success' => $json['success'] ?? true,
                'categoryId' => $categoryId,
                'baseAttributes' => $data['baseAttributes'] ?? [],
                'attributes' => $data['attributes'] ?? [],
                'variantAttributes' => $data['variantAttributes'] ?? [],
            ];
        }

        return [
            'success' => false,
            'categoryId' => $categoryId,
            'baseAttributes' => [],
            'attributes' => [],
            'variantAttributes' => [],
        ];
    }

    public function getAttributeValues(int $categoryId, string $attributeId): array
    {
        $response = $this->makeRequest('get', "/product/api/categories/{$categoryId}/attribute/{$attributeId}/values", [
            'query' => ['version' => 5, 'page' => 0, 'size' => 1000],
        ]);

        if ($response->successful()) {
            $json = $response->json();
            $data = $json['data'] ?? $json;

            return [
                'success' => true,
                'categoryId' => $categoryId,
                'attributeId' => $attributeId,
                'values' => is_array($data) ? $data : [],
            ];
        }

        throw new \RuntimeException("Özellik değerleri alınamadı (Cat: {$categoryId}, Attr: {$attributeId}): " . $response->body());
    }

    // ==========================================
    // MARKA (Hepsiburada'da marka yok, base'den geliyor)
    // ==========================================

    public function syncBrands(): int
    {
        // Hepsiburada'da ayrı marka API'si yok
        return 0;
    }

    // ==========================================
    // ÜRÜN YÖNETİMİ
    // ==========================================

    public function createProducts(array $products): array
    {
        $jsonContent = json_encode($products, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        $fileName = 'products_' . time() . '.json';

        Log::info('HB createProducts: Gönderilecek payload', [
            'item_count' => count($products),
            'payload_preview' => mb_substr($jsonContent, 0, 2000),
        ]);

        $authString = base64_encode($this->credential->api_key . ':' . $this->credential->api_secret);
        $supplierId = $this->credential->supplier_id ?? '';

        // Multipart upload için Content-Type header'ı set etmemeliyiz — Guzzle otomatik handle eder
        $response = Http::withHeaders([
                'Authorization' => 'Basic ' . $authString,
                'Accept' => 'application/json',
                'User-Agent' => $this->credential->user_agent ?: ($supplierId . ' - SelfIntegration'),
            ])
            ->timeout($this->timeout)
            ->attach('file', $jsonContent, $fileName, ['Content-Type' => 'application/json'])
            ->post($this->baseUrl . '/product/api/products/import?version=1');

        Log::info('HB createProducts: API yanıtı', [
            'status' => $response->status(),
            'body' => mb_substr($response->body(), 0, 1000),
        ]);

        if ($response->successful()) {
            return [
                'trackingId' => $response->json('data.trackingId') ?? $response->json('trackingId'),
            ];
        }

        throw new \RuntimeException('HB ürünler oluşturulamadı: ' . $response->body());
    }

    public function updateProducts(array $products): array
    {
        return $this->createProducts($products);
    }

    public function updatePriceAndStock(array $items): array
    {
        // HB'de Mağaza ID = API Key
        $merchantId = $this->credential->seller_id ?? $this->credential->api_key;

        $results = ['price' => null, 'stock' => null];

        // Stok güncelleme
        $stockItems = array_filter($items, fn($item) => isset($item['stock']));
        if (!empty($stockItems)) {
            $stockPayload = array_map(fn($item) => [
                'merchantSku' => $item['merchantSku'] ?? $item['barcode'],
                'quantity' => $item['stock'],
            ], $stockItems);

            $response = Http::withHeaders($this->getAuthHeaders())
                ->timeout($this->timeout)
                ->post($this->listingBaseUrl . "/listings/merchantid/{$merchantId}/stock-uploads", $stockPayload);

            $results['stock'] = $response->successful() ? 'success' : $response->body();
        }

        // Fiyat güncelleme
        $priceItems = array_filter($items, fn($item) => isset($item['price']));
        if (!empty($priceItems)) {
            $pricePayload = array_map(fn($item) => [
                'merchantSku' => $item['merchantSku'] ?? $item['barcode'],
                'price' => $item['price'],
            ], $priceItems);

            $response = Http::withHeaders($this->getAuthHeaders())
                ->timeout($this->timeout)
                ->post($this->listingBaseUrl . "/listings/merchantid/{$merchantId}/price-uploads", $pricePayload);

            $results['price'] = $response->successful() ? 'success' : $response->body();
        }

        return $results;
    }

    public function getProducts(array $filters = []): array
    {
        $merchantId = $this->credential->seller_id ?? $this->credential->api_key;
        $status = $filters['status'] ?? 'MATCHED';

        $response = $this->makeRequest('get', '/product/api/products/products-by-merchant-and-status', [
            'query' => [
                'merchantId' => $merchantId,
                'productStatus' => $status,
                'page' => $filters['page'] ?? 0,
                'size' => $filters['size'] ?? 50,
            ],
        ]);

        if ($response->successful()) {
            $json = $response->json();

            return [
                'products' => $json['data'] ?? [],
                'totalElements' => $json['totalElements'] ?? 0,
                'totalPages' => $json['totalPages'] ?? 0,
                'page' => $json['number'] ?? 0,
            ];
        }

        throw new \RuntimeException('HB ürün listesi alınamadı: ' . $response->body());
    }

    public function getProductStatus(string $trackingId, int $page = 0, int $size = 1000): array
    {
        $response = $this->makeRequest('get', "/product/api/products/status/{$trackingId}", [
            'query' => [
                'version' => 1,
                'page' => $page,
                'size' => $size,
            ],
        ]);

        if ($response->successful()) {
            $json = $response->json() ?? [];

            Log::info('HB getProductStatus yanıtı', [
                'trackingId' => $trackingId,
                'body_preview' => mb_substr(json_encode($json, JSON_UNESCAPED_UNICODE), 0, 2000),
            ]);

            return $json;
        }

        throw new \RuntimeException('HB ürün durumu alınamadı: ' . $response->body());
    }

    public function getListings(int $offset = 0, int $limit = 100): array
    {
        $merchantId = $this->credential->seller_id ?? $this->credential->api_key;

        $response = Http::withHeaders($this->getAuthHeaders())
            ->timeout($this->timeout)
            ->get($this->listingBaseUrl . "/listings/merchantid/{$merchantId}", [
                'offset' => $offset,
                'limit' => $limit,
            ]);

        if ($response->successful()) {
            return $response->json() ?? [];
        }

        throw new \RuntimeException('HB listing listesi alınamadı: ' . $response->body());
    }

    // ==========================================
    // TEST
    // ==========================================

    public function testConnection(): bool
    {
        try {
            $response = $this->makeRequest('get', '/product/api/categories/get-all-categories', [
                'query' => ['status' => 'ACTIVE', 'type' => 'HB', 'version' => 1, 'page' => 0, 'size' => 1],
            ]);

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('HepsiBurada API bağlantı testi başarısız: ' . $e->getMessage());

            return false;
        }
    }
}
