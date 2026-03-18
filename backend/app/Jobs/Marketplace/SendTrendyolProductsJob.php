<?php

namespace App\Jobs\Marketplace;

use App\Models\MarketplaceBrandMapping;
use App\Models\MarketplaceCargoCompany;
use App\Models\MarketplaceCategoryMapping;
use App\Models\MarketplaceCredential;
use App\Models\MarketplaceProduct;
use App\Models\Product;
use App\Services\Marketplace\TrendyolApiService;
use App\Services\Marketplace\TrendyolProductFormatter;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendTrendyolProductsJob implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;
    public int $tries = 2;

    /**
     * @param array<int,float> $priceOverrides productId/variantId → overridePrice (Trendyol gönderim fiyatı, DB değişmez)
     */
    public function __construct(
        public readonly int $credentialId,
        public readonly array $productIds,
        public readonly int $cargoCompanyId,
        public readonly array $priceOverrides = [],
        public readonly int $minStock = 0,
    ) {}

    public function handle(): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        $credential = MarketplaceCredential::findOrFail($this->credentialId);
        $service = new TrendyolApiService($credential);
        $formatter = new TrendyolProductFormatter();

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

        foreach ($products as $product) {
            $brandMapping = MarketplaceBrandMapping::where('marketplace', 'trendyol')
                ->where('local_brand_id', $product->brand_id)
                ->first();

            if (! $brandMapping) {
                $this->markProductError($product->id, 'Marka eşleştirmesi bulunamadı');
                continue;
            }

            $categoryMapping = MarketplaceCategoryMapping::where('marketplace', 'trendyol')
                ->where('local_category_id', $product->category_id)
                ->first();

            $categoryAttributes = [];
            if ($categoryMapping?->marketplaceCategory) {
                $storedAttributes = $categoryMapping->marketplaceCategory->attributes;
                if (! empty($storedAttributes)) {
                    $categoryAttributes = $storedAttributes;
                } else {
                    try {
                        $categoryAttributes = $service->getCategoryAttributes(
                            $categoryMapping->marketplaceCategory->marketplace_category_id
                        );
                    } catch (\Exception) {
                        // Özellik alınamazsa devam et
                    }
                }
            }

            // Fiyat override'ları varsa in-memory uygula (DB değişmez, sadece Trendyol payload'ı etkilenir)
            if (! empty($this->priceOverrides)) {
                Log::info('SendTrendyolProductsJob: Price overrides mevcut', [
                    'product_id' => $product->id,
                    'override_keys' => array_keys($this->priceOverrides),
                    'product_db_price' => $product->price,
                ]);

                if (isset($this->priceOverrides[$product->id])) {
                    $newPrice = (float) $this->priceOverrides[$product->id];
                    Log::info('SendTrendyolProductsJob: Product price override', [
                        'product_id' => $product->id,
                        'old_price' => $product->price,
                        'new_price' => $newPrice,
                    ]);
                    $product->price = $newPrice;
                    $product->compare_price = $newPrice;
                }
                foreach ($product->variants as $variant) {
                    if (isset($this->priceOverrides[$variant->id])) {
                        $newPrice = (float) $this->priceOverrides[$variant->id];
                        Log::info('SendTrendyolProductsJob: Variant price override', [
                            'product_id' => $product->id,
                            'variant_id' => $variant->id,
                            'old_price' => $variant->price,
                            'new_price' => $newPrice,
                        ]);
                        $variant->price = $newPrice;
                        $variant->compare_price = $newPrice;
                    }
                }
            } else {
                Log::info('SendTrendyolProductsJob: Price overrides BOŞ', [
                    'product_id' => $product->id,
                    'priceOverrides_raw' => $this->priceOverrides,
                ]);
            }

            // Kritik stok filtresi: varyantları tek tek ele, eşik altındakileri çıkar
            if ($this->minStock > 0) {
                $activeVariants = $product->variants->where('is_active', true);

                if ($activeVariants->isNotEmpty()) {
                    // Varyantlı ürün: eşik altındaki varyantları kaldır
                    $filtered = $activeVariants->filter(fn ($v) => $v->stock_quantity > $this->minStock);

                    if ($filtered->isEmpty()) {
                        $this->markProductError($product->id, "Tüm varyantların stoku kritik stok ({$this->minStock}) altında");
                        continue;
                    }

                    // Relation'ı filtrelenmiş koleksiyonla değiştir
                    $product->setRelation('variants', $filtered->values());
                } else {
                    // Varyantsız ürün
                    if ($product->stock_quantity <= $this->minStock) {
                        $this->markProductError($product->id, "Ürün stoku kritik stok ({$this->minStock}) altında");
                        continue;
                    }
                }
            }

            $productItems = $formatter->formatProductItems(
                $product,
                $categoryAttributes,
                $brandMapping->marketplace_brand_id,
                $this->cargoCompanyId
            );

            // Boş barkodlu item'ları filtrele
            $productItems = array_filter($productItems, function ($item) {
                return ! empty($item['barcode']) && mb_strlen($item['barcode']) >= 2;
            });

            if (empty($productItems)) {
                $this->markProductError($product->id, 'Ürün veya varyantlarında geçerli barkod bulunamadı');
                continue;
            }

            // Detaylı varyant payload logu
            $activeVariants = $product->variants->where('is_active', true);
            Log::info('SendTrendyolProductsJob: Ürün formatlandı', [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'has_variants' => $activeVariants->isNotEmpty(),
                'variant_count' => $activeVariants->count(),
                'item_count' => count($productItems),
                'items_summary' => collect($productItems)->map(fn ($item) => [
                    'barcode' => $item['barcode'] ?? null,
                    'productMainId' => $item['productMainId'] ?? null,
                    'stockCode' => $item['stockCode'] ?? null,
                    'quantity' => $item['quantity'] ?? null,
                    'attributes' => $item['attributes'] ?? [],
                ])->toArray(),
            ]);

            $items = array_merge($items, array_values($productItems));
            $processedProductIds[] = $product->id;

            // MarketplaceProduct kaydını oluştur/güncelle
            $mpProduct = MarketplaceProduct::updateOrCreate(
                [
                    'marketplace' => 'trendyol',
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
            Log::warning('SendTrendyolProductsJob: Chunk içinde gönderilecek ürün yok', [
                'product_ids' => $this->productIds,
            ]);
            return;
        }

        // Tam payload logu — API'ye gönderilecek veri
        Log::info('SendTrendyolProductsJob: API payload', [
            'total_items' => count($items),
            'product_ids' => $processedProductIds,
            'payload' => ['items' => $items],
        ]);

        try {
            $result = $service->createProducts($items);

            // Batch request ID'yi marketplace_products'a kaydet
            $batchRequestId = $result['batchRequestId'] ?? null;
            if ($batchRequestId) {
                MarketplaceProduct::where('marketplace', 'trendyol')
                    ->whereIn('product_id', $processedProductIds)
                    ->update(['batch_request_id' => $batchRequestId]);
            }

            Log::info('SendTrendyolProductsJob: Chunk gönderildi', [
                'item_count' => count($items),
                'product_count' => count($processedProductIds),
                'batch_request_id' => $batchRequestId,
            ]);
        } catch (\Exception $e) {
            Log::error('SendTrendyolProductsJob: API hatası', [
                'product_ids' => $this->productIds,
                'error' => $e->getMessage(),
            ]);

            // Hata durumunda tüm ürünleri işaretle
            MarketplaceProduct::where('marketplace', 'trendyol')
                ->whereIn('product_id', $processedProductIds)
                ->update([
                    'status' => 'rejected',
                    'error_message' => mb_substr($e->getMessage(), 0, 500),
                ]);

            throw $e;
        }
    }

    protected function markProductError(int $productId, string $message): void
    {
        MarketplaceProduct::updateOrCreate(
            [
                'marketplace' => 'trendyol',
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
        Log::error('SendTrendyolProductsJob failed', [
            'credential_id' => $this->credentialId,
            'product_ids' => $this->productIds,
            'error' => $exception?->getMessage(),
        ]);
    }
}
