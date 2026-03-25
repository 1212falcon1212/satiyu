<?php

namespace App\Services\Marketplace;

use App\Models\MarketplaceCategory;
use App\Models\MarketplaceCredential;
use Illuminate\Support\Facades\Log;

class CiceksepetiApiService extends MarketplaceService
{
    protected int $timeout = 60;
    protected int $rateLimitRequests = 1;
    protected int $rateLimitSeconds = 5;

    public function __construct(MarketplaceCredential $credential)
    {
        parent::__construct($credential);
    }

    protected function getDefaultBaseUrl(): string
    {
        return 'https://apis.ciceksepeti.com/api/v1';
    }

    protected function getAuthHeaders(): array
    {
        return [
            'x-api-key' => $this->credential->api_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ];
    }

    // ==========================================
    // KATEGORI
    // ==========================================

    public function syncCategories(): int
    {
        $response = $this->makeRequest('get', '/Categories');

        if (!$response->successful()) {
            throw new \RuntimeException('Kategori listesi alınamadı: ' . $response->body());
        }

        $categories = $response->json('categories') ?? [];
        $count = 0;

        $this->saveCategoriesRecursive($categories, null, $count);

        Log::info('Çiçeksepeti kategorileri senk edildi', ['count' => $count]);

        return $count;
    }

    protected function saveCategoriesRecursive(array $categories, ?int $parentId, int &$count): void
    {
        foreach ($categories as $cat) {
            MarketplaceCategory::updateOrCreate(
                [
                    'marketplace' => 'ciceksepeti',
                    'marketplace_category_id' => $cat['id'],
                ],
                [
                    'category_name' => $cat['name'] ?? '',
                    'parent_id' => $parentId,
                    'last_synced_at' => now(),
                ]
            );
            $count++;

            if (!empty($cat['subCategories'])) {
                $this->saveCategoriesRecursive($cat['subCategories'], $cat['id'], $count);
            }
        }
    }

    public function getCategoryAttributes(int $categoryId): array
    {
        $response = $this->makeRequest('get', "/Categories/{$categoryId}/attributes");

        if ($response->successful()) {
            return $response->json('categoryAttributes') ?? [];
        }

        throw new \RuntimeException("Kategori özellikleri alınamadı (ID: {$categoryId}): " . $response->body());
    }

    public function syncCategoryAttributes(?callable $onProgress = null, bool $forceAll = false): array
    {
        $parentIds = MarketplaceCategory::where('marketplace', 'ciceksepeti')
            ->whereNotNull('parent_id')
            ->pluck('parent_id')
            ->unique()
            ->toArray();

        $query = MarketplaceCategory::where('marketplace', 'ciceksepeti')
            ->whereNotIn('marketplace_category_id', $parentIds);

        if (!$forceAll) {
            $query->whereNull('attributes');
        }

        $leafCategories = $query->get();
        $total = $leafCategories->count();
        $synced = 0;
        $failed = 0;

        foreach ($leafCategories as $index => $category) {
            try {
                $attributes = $this->getCategoryAttributes((int) $category->marketplace_category_id);

                $category->update([
                    'attributes' => $attributes,
                    'last_synced_at' => now(),
                ]);

                $synced++;

                if ($onProgress) {
                    $onProgress($index + 1, $total, $category->category_name, true);
                }
            } catch (\Exception $e) {
                $failed++;

                Log::warning('Çiçeksepeti kategori özellikleri alınamadı', [
                    'category_id' => $category->marketplace_category_id,
                    'category_name' => $category->category_name,
                    'error' => $e->getMessage(),
                ]);

                if ($onProgress) {
                    $onProgress($index + 1, $total, $category->category_name, false);
                }
            }

            // Rate limit: 5 saniyede 1 istek
            usleep(5_100_000);
        }

        Log::info('Çiçeksepeti kategori özellikleri senk edildi', [
            'synced' => $synced,
            'failed' => $failed,
            'total' => $total,
        ]);

        return [
            'synced' => $synced,
            'failed' => $failed,
            'total' => $total,
        ];
    }

    // ==========================================
    // MARKA (Çiçeksepeti'de ayrı marka API'si yok)
    // ==========================================

    public function syncBrands(): int
    {
        // Çiçeksepeti'de ayrı bir marka servisi bulunmamaktadır
        return 0;
    }

    // ==========================================
    // ÜRÜN YÖNETİMİ
    // ==========================================

    public function createProducts(array $products): array
    {
        if (count($products) > 1000) {
            throw new \RuntimeException('Maksimum 1000 ürün gönderilebilir.');
        }

        $response = $this->makeRequest('post', '/Products', [
            'json' => ['products' => $products],
        ]);

        if ($response->successful()) {
            return ['batchId' => $response->json('batchId')];
        }

        throw new \RuntimeException('Ürünler oluşturulamadı: ' . $response->body());
    }

    public function updateProducts(array $products): array
    {
        return $this->createProducts($products);
    }

    public function updatePriceAndStock(array $items): array
    {
        if (count($items) > 200) {
            throw new \RuntimeException('Maksimum 200 item gönderilebilir.');
        }

        // Rate limit: farklı body ile saniyede 1, aynı body ile 30 dk'da 1
        $this->rateLimitRequests = 1;
        $this->rateLimitSeconds = 1;

        $response = $this->makeRequest('put', '/Products/price-and-stock', [
            'json' => ['items' => $items],
        ]);

        if ($response->successful()) {
            return ['batchId' => $response->json('batchId')];
        }

        throw new \RuntimeException('Fiyat ve stok güncellenemedi: ' . $response->body());
    }

    public function getProducts(array $filters = []): array
    {
        // Çiçeksepeti'de ayrı ürün listeleme endpoint'i farklı çalışır
        // Batch status üzerinden takip yapılır
        return [];
    }

    // ==========================================
    // BATCH TAKIP
    // ==========================================

    public function getBatchStatus(string $batchId): array
    {
        $response = $this->makeRequest('get', "/Products/batch-status/{$batchId}");

        if ($response->successful()) {
            return $response->json() ?? [];
        }

        throw new \RuntimeException('Batch sonucu alınamadı: ' . $response->body());
    }

    public function getBatchFailedItems(string $batchId): array
    {
        $result = $this->getBatchStatus($batchId);
        $failedItems = [];

        foreach ($result['items'] ?? [] as $item) {
            if (($item['status'] ?? '') === 'Failed') {
                $reasons = [];
                foreach ($item['failureReasons'] ?? [] as $reason) {
                    $reasons[] = [
                        'message' => $reason['message'] ?? '',
                        'code' => $reason['code'] ?? null,
                    ];
                }
                $failedItems[] = [
                    'stockCode' => $item['data']['stockCode'] ?? null,
                    'reasons' => $reasons,
                ];
            }
        }

        return $failedItems;
    }

    // ==========================================
    // TEST
    // ==========================================

    public function testConnection(): bool
    {
        try {
            $this->makeRequest('get', '/Categories');

            return true;
        } catch (\Exception $e) {
            Log::error('Çiçeksepeti API bağlantı testi başarısız: ' . $e->getMessage());

            return false;
        }
    }
}
