<?php

namespace App\Services\Marketplace;

use App\Models\MarketplaceBrandMapping;
use App\Models\MarketplaceCargoCompany;
use App\Models\MarketplaceCategory;
use App\Models\MarketplaceCredential;
use Illuminate\Support\Facades\Log;

class TrendyolApiService extends MarketplaceService
{
    protected int $timeout = 60;
    protected int $rateLimitRequests = 50;
    protected int $rateLimitSeconds = 10;

    public function __construct(MarketplaceCredential $credential)
    {
        parent::__construct($credential);
    }

    protected function getDefaultBaseUrl(): string
    {
        return 'https://apigw.trendyol.com';
    }

    // ==========================================
    // KATEGORI
    // ==========================================

    public function syncCategories(): int
    {
        $response = $this->makeRequest('get', '/integration/product/product-categories');

        if (!$response->successful()) {
            throw new \RuntimeException('Kategori ağacı alınamadı: ' . $response->body());
        }

        $categories = $response->json('categories') ?? [];
        $count = 0;

        $this->saveCategoriesRecursive($categories, null, $count);

        Log::info('Trendyol kategorileri senk edildi', ['count' => $count]);

        return $count;
    }

    protected function saveCategoriesRecursive(array $categories, ?int $parentId, int &$count): void
    {
        foreach ($categories as $cat) {
            MarketplaceCategory::updateOrCreate(
                [
                    'marketplace' => 'trendyol',
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
        $response = $this->makeRequest('get', "/integration/product/product-categories/{$categoryId}/attributes");

        if ($response->successful()) {
            return $response->json('categoryAttributes') ?? [];
        }

        throw new \RuntimeException("Kategori özellikleri alınamadı (ID: {$categoryId}): " . $response->body());
    }

    /**
     * Tüm yaprak kategorilerin özelliklerini çeker ve DB'ye kaydeder.
     * Uzun süren işlem — progress callback ile ilerleme raporlanır.
     *
     * @param callable|null $onProgress fn(int $current, int $total, string $categoryName, bool $success)
     * @param bool $forceAll true ise zaten attributes'u olan kategorileri de günceller
     */
    public function syncCategoryAttributes(?callable $onProgress = null, bool $forceAll = false): array
    {
        // Yaprak kategorileri bul: parent_id olarak kullanılmayan kategoriler
        $parentIds = MarketplaceCategory::where('marketplace', 'trendyol')
            ->whereNotNull('parent_id')
            ->pluck('parent_id')
            ->unique()
            ->toArray();

        $query = MarketplaceCategory::where('marketplace', 'trendyol')
            ->whereNotIn('marketplace_category_id', $parentIds);

        if (!$forceAll) {
            $query->whereNull('attributes');
        }

        $leafCategories = $query->get();
        $total = $leafCategories->count();
        $synced = 0;
        $failed = 0;
        $skipped = 0;

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

                Log::warning('Kategori özellikleri alınamadı', [
                    'category_id' => $category->marketplace_category_id,
                    'category_name' => $category->category_name,
                    'error' => $e->getMessage(),
                ]);

                if ($onProgress) {
                    $onProgress($index + 1, $total, $category->category_name, false);
                }
            }

            // Rate limit koruması: her istek arasında 250ms bekle (max ~4 req/s)
            usleep(250_000);
        }

        Log::info('Trendyol kategori özellikleri senk edildi', [
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
    // MARKA
    // ==========================================

    public function syncBrands(): int
    {
        $page = 0;
        $size = 500;
        $totalSynced = 0;

        while (true) {
            $response = $this->makeRequest('get', "/integration/product/brands", [
                'query' => ['page' => $page, 'size' => $size],
            ]);

            if (!$response->successful()) {
                throw new \RuntimeException('Marka listesi alınamadı: ' . $response->body());
            }

            $brands = $response->json('brands') ?? [];

            if (empty($brands)) {
                break;
            }

            foreach ($brands as $brand) {
                MarketplaceBrandMapping::updateOrCreate(
                    [
                        'marketplace' => 'trendyol',
                        'marketplace_brand_id' => $brand['id'],
                    ],
                    [
                        'marketplace_brand_name' => $brand['name'] ?? '',
                    ]
                );
                $totalSynced++;
            }

            Log::info('Trendyol marka senk sayfasi', ['page' => $page, 'count' => count($brands)]);

            // Son sayfadaysak dur: dönen kayit sayisi istenen size'dan azsa daha fazla yok
            if (count($brands) < $size) {
                break;
            }

            $page++;
        }

        Log::info('Trendyol markalari senk edildi', ['count' => $totalSynced]);

        return $totalSynced;
    }

    public function searchBrand(string $name): ?array
    {
        $response = $this->makeRequest('get', '/integration/product/brands/by-name', [
            'query' => ['name' => $name],
        ]);

        if ($response->successful()) {
            return $response->json('brands') ?? [];
        }

        return [];
    }

    // ==========================================
    // KARGO
    // ==========================================

    public function syncCargoCompanies(): int
    {
        $response = $this->makeRequest('get', '/integration/product/shipment-providers');

        if (!$response->successful()) {
            throw new \RuntimeException('Kargo firmaları alınamadı: ' . $response->body());
        }

        $providers = $response->json('shipmentProviders') ?? [];
        $count = 0;

        foreach ($providers as $provider) {
            MarketplaceCargoCompany::updateOrCreate(
                [
                    'marketplace' => 'trendyol',
                    'cargo_company_id' => $provider['id'],
                ],
                [
                    'cargo_company_name' => $provider['name'] ?? '',
                ]
            );
            $count++;
        }

        Log::info('Trendyol kargo şirketleri senk edildi', ['count' => $count]);

        return $count;
    }

    // ==========================================
    // ÜRÜN YÖNETİMİ
    // ==========================================

    public function createProducts(array $products): array
    {
        $sellerId = $this->getSellerId();

        $response = $this->makeRequest('post', "/integration/product/sellers/{$sellerId}/products", [
            'json' => ['items' => $products],
        ]);

        if ($response->successful()) {
            return ['batchRequestId' => $response->json('batchRequestId')];
        }

        throw new \RuntimeException('Ürünler oluşturulamadı: ' . $response->body());
    }

    public function updateProducts(array $products): array
    {
        $sellerId = $this->getSellerId();

        $response = $this->makeRequest('put', "/integration/product/sellers/{$sellerId}/products", [
            'json' => ['items' => $products],
        ]);

        if ($response->successful()) {
            return ['batchRequestId' => $response->json('batchRequestId')];
        }

        throw new \RuntimeException('Ürünler güncellenemedi: ' . $response->body());
    }

    public function deleteProducts(array $barcodes): array
    {
        $sellerId = $this->getSellerId();

        $items = array_map(fn (string $barcode) => ['barcode' => $barcode], $barcodes);

        $response = $this->makeRequest('delete', "/integration/product/sellers/{$sellerId}/products", [
            'json' => ['items' => $items],
        ]);

        if ($response->successful()) {
            return ['batchRequestId' => $response->json('batchRequestId')];
        }

        throw new \RuntimeException('Ürünler silinemedi: ' . $response->body());
    }

    public function updatePriceAndStock(array $items): array
    {
        $sellerId = $this->getSellerId();

        if (count($items) > 1000) {
            throw new \RuntimeException('Maksimum 1000 item gönderilebilir.');
        }

        $response = $this->makeRequest('post', "/integration/inventory/sellers/{$sellerId}/products/price-and-inventory", [
            'json' => ['items' => $items],
        ]);

        if ($response->successful()) {
            return ['batchRequestId' => $response->json('batchRequestId')];
        }

        throw new \RuntimeException('Fiyat ve stok güncellenemedi: ' . $response->body());
    }

    public function getProducts(array $filters = []): array
    {
        $sellerId = $this->getSellerId();

        $params = array_merge(['page' => 0, 'size' => 50], $filters);

        foreach (['approved', 'archived', 'onSale', 'rejected', 'blacklisted'] as $boolField) {
            if (isset($params[$boolField])) {
                $params[$boolField] = $params[$boolField] ? 'true' : 'false';
            }
        }

        $response = $this->makeRequest('get', "/integration/product/sellers/{$sellerId}/products", [
            'query' => $params,
        ]);

        if ($response->successful()) {
            return [
                'products' => $response->json('content') ?? [],
                'totalPages' => $response->json('totalPages') ?? 0,
                'totalElements' => $response->json('totalElements') ?? 0,
                'page' => $response->json('page') ?? 0,
            ];
        }

        throw new \RuntimeException('Ürün listesi alınamadı: ' . $response->body());
    }

    public function getProductByBarcode(string $barcode): ?array
    {
        $result = $this->getProducts(['barcode' => $barcode]);

        return $result['products'][0] ?? null;
    }

    // ==========================================
    // BATCH TAKIP
    // ==========================================

    public function getBatchStatus(string $batchRequestId): array
    {
        $sellerId = $this->getSellerId();

        $response = $this->makeRequest('get', "/integration/product/sellers/{$sellerId}/products/batch-requests/{$batchRequestId}");

        if ($response->successful()) {
            return $response->json() ?? [];
        }

        throw new \RuntimeException('Batch sonucu alınamadı: ' . $response->body());
    }

    public function getBatchFailedItems(string $batchRequestId): array
    {
        $result = $this->getBatchStatus($batchRequestId);
        $failedItems = [];

        foreach ($result['items'] ?? [] as $item) {
            if (($item['status'] ?? '') !== 'SUCCESS' && !empty($item['failureReasons'])) {
                $failedItems[] = [
                    'barcode' => $item['requestItem']['barcode'] ?? $item['requestItem']['product']['barcode'] ?? null,
                    'reasons' => $item['failureReasons'],
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
            $this->makeRequest('get', '/integration/product/product-categories');

            return true;
        } catch (\Exception $e) {
            Log::error('Trendyol API bağlantı testi başarısız: ' . $e->getMessage());

            return false;
        }
    }
}
