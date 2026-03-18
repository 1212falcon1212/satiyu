<?php

namespace App\Jobs\Marketplace;

use App\Models\MarketplaceCategoryMapping;
use App\Models\MarketplaceCredential;
use App\Models\MarketplaceProduct;
use App\Models\Product;
use App\Services\Marketplace\HepsiburadaApiService;
use App\Services\Marketplace\HepsiburadaProductFormatter;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendHepsiburadaProductsJob implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;
    public int $tries = 2;

    public function __construct(
        public readonly int $credentialId,
        public readonly array $productIds,
        public readonly array $priceOverrides = [],
    ) {}

    public function handle(): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        $credential = MarketplaceCredential::findOrFail($this->credentialId);
        $service = new HepsiburadaApiService($credential);
        $formatter = new HepsiburadaProductFormatter();
        // HB'de Mağaza ID = API Key = Merchant ID (aynı değer)
        $merchantId = $credential->seller_id ?? $credential->api_key;

        $products = Product::with([
            'images', 'brand', 'category', 'attributes',
            'variants' => fn ($q) => $q->where('is_active', true),
            'variants.variantValues.variantOption.variantType',
            'variants.images',
        ])
            ->whereIn('id', $this->productIds)
            ->get();

        $items = [];
        $processedProductIds = [];

        // In-memory price override (toplu fiyat güncelleme)
        if (! empty($this->priceOverrides)) {
            foreach ($products as $product) {
                if (isset($this->priceOverrides[$product->id])) {
                    $product->price = (float) $this->priceOverrides[$product->id];
                    $product->compare_price = $product->price;
                }
                foreach ($product->variants as $variant) {
                    if (isset($this->priceOverrides[$variant->id])) {
                        $variant->price = (float) $this->priceOverrides[$variant->id];
                        $variant->compare_price = $variant->price;
                    }
                }
            }
        }

        foreach ($products as $product) {
            $categoryMapping = MarketplaceCategoryMapping::where('marketplace', 'hepsiburada')
                ->where('local_category_id', $product->category_id)
                ->first();

            $categoryAttributes = [];
            if ($categoryMapping?->marketplaceCategory) {
                $storedAttributes = $categoryMapping->marketplaceCategory->attributes;
                if (! empty($storedAttributes)) {
                    // Normalize: baseAttributes + attributes + variantAttributes → tek array with _group
                    $categoryAttributes = $this->normalizeCategoryAttributes($storedAttributes);
                } else {
                    try {
                        $rawAttrs = $service->getCategoryAttributes(
                            $categoryMapping->marketplaceCategory->marketplace_category_id
                        );
                        $categoryAttributes = $this->normalizeCategoryAttributes($rawAttrs);
                    } catch (\Exception) {
                        // Özellik alınamazsa devam et
                    }
                }
            }

            $productItems = $formatter->formatProductItems(
                $product,
                $categoryAttributes,
                $merchantId,
            );

            // Boş barkodlu item'ları filtrele
            $productItems = array_filter($productItems, function ($item) {
                $barcode = $item['attributes']['Barcode'] ?? '';

                return ! empty($barcode) && mb_strlen($barcode) >= 2;
            });

            if (empty($productItems)) {
                $this->markProductError($product->id, 'Ürün veya varyantlarında geçerli barkod bulunamadı');

                continue;
            }

            $items = array_merge($items, array_values($productItems));
            $processedProductIds[] = $product->id;

            // MarketplaceProduct kaydını oluştur/güncelle
            $mpProduct = MarketplaceProduct::updateOrCreate(
                [
                    'marketplace' => 'hepsiburada',
                    'product_id' => $product->id,
                ],
                [
                    'marketplace_barcode' => $product->barcode,
                    'status' => 'pending',
                    'price' => $product->price,
                    'sale_price' => $product->price,
                    'last_synced_at' => now(),
                ]
            );

            // Varyant tracking
            $activeVariants = $product->variants->where('is_active', true);
            if ($activeVariants->isNotEmpty()) {
                $listingData = $mpProduct->listing_data ?? [];
                $listingData['variants'] = [];
                foreach ($activeVariants as $variant) {
                    $listingData['variants'][$variant->id] = [
                        'barcode' => $variant->barcode ?: $product->barcode,
                        'sku' => $variant->sku ?: $variant->barcode ?: $product->sku,
                        'status' => 'pending',
                        'last_synced_at' => now()->toISOString(),
                    ];
                }
                $mpProduct->listing_data = $listingData;
                $mpProduct->save();
            }
        }

        if (empty($items)) {
            Log::warning('SendHepsiburadaProductsJob: Chunk içinde gönderilecek ürün yok', [
                'product_ids' => $this->productIds,
            ]);

            return;
        }

        try {
            $result = $service->createProducts($items);

            // Tracking ID'yi marketplace_products'a kaydet
            $trackingId = $result['trackingId'] ?? null;
            if ($trackingId) {
                MarketplaceProduct::where('marketplace', 'hepsiburada')
                    ->whereIn('product_id', $processedProductIds)
                    ->update(['batch_request_id' => $trackingId]);
            }

            Log::info('SendHepsiburadaProductsJob: Chunk gönderildi', [
                'item_count' => count($items),
                'product_count' => count($processedProductIds),
                'tracking_id' => $trackingId,
            ]);
        } catch (\Exception $e) {
            Log::error('SendHepsiburadaProductsJob: API hatası', [
                'product_ids' => $this->productIds,
                'error' => $e->getMessage(),
            ]);

            // Hata durumunda tüm ürünleri işaretle
            MarketplaceProduct::where('marketplace', 'hepsiburada')
                ->whereIn('product_id', $processedProductIds)
                ->update([
                    'status' => 'rejected',
                    'error_message' => mb_substr($e->getMessage(), 0, 500),
                ]);

            throw $e;
        }
    }

    /**
     * HB attributes normalize: baseAttributes + attributes + variantAttributes → tek array with _group tag.
     */
    protected function normalizeCategoryAttributes(array $rawAttrs): array
    {
        $normalized = [];

        foreach (['baseAttributes', 'attributes', 'variantAttributes'] as $group) {
            $groupAttrs = $rawAttrs[$group] ?? [];
            if (! is_array($groupAttrs)) {
                continue;
            }
            foreach ($groupAttrs as $attr) {
                $attr['_group'] = $group;
                $normalized[] = $attr;
            }
        }

        // If the raw data is already a flat array (not grouped), return as-is
        if (empty($normalized) && ! empty($rawAttrs) && isset($rawAttrs[0])) {
            return $rawAttrs;
        }

        return $normalized;
    }

    protected function markProductError(int $productId, string $message): void
    {
        MarketplaceProduct::updateOrCreate(
            [
                'marketplace' => 'hepsiburada',
                'product_id' => $productId,
            ],
            [
                'status' => 'rejected',
                'error_message' => $message,
                'last_synced_at' => now(),
            ]
        );
    }

    public function failed(?\Throwable $exception): void
    {
        Log::error('SendHepsiburadaProductsJob failed', [
            'credential_id' => $this->credentialId,
            'product_ids' => $this->productIds,
            'error' => $exception?->getMessage(),
        ]);
    }
}
