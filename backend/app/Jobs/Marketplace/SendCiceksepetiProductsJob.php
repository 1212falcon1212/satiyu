<?php

namespace App\Jobs\Marketplace;

use App\Models\MarketplaceCategoryMapping;
use App\Models\MarketplaceCredential;
use App\Models\MarketplaceProduct;
use App\Models\Product;
use App\Services\Marketplace\CiceksepetiApiService;
use App\Services\Marketplace\CiceksepetiProductFormatter;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendCiceksepetiProductsJob implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;
    public int $tries = 2;

    public function __construct(
        public readonly int $credentialId,
        public readonly array $productIds,
        public readonly int $deliveryType = 2,
        public readonly int $deliveryMessageType = 5,
        public readonly array $priceOverrides = [],
        public readonly int $minStock = 0,
    ) {}

    public function handle(): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        $credential = MarketplaceCredential::findOrFail($this->credentialId);
        $service = new CiceksepetiApiService($credential);
        $formatter = new CiceksepetiProductFormatter();

        $products = Product::with([
            'images', 'brand', 'category', 'attributes',
            'variants' => fn($q) => $q->where('is_active', true),
            'variants.variantValues.variantOption.variantType',
            'variants.images',
        ])
            ->whereIn('id', $this->productIds)
            ->get();

        $items = [];
        $processedProductIds = [];

        foreach ($products as $product) {
            $categoryMapping = MarketplaceCategoryMapping::where('marketplace', 'ciceksepeti')
                ->where('local_category_id', $product->category_id)
                ->first();

            if (!$categoryMapping) {
                $this->markProductError($product->id, 'Kategori eşleştirmesi bulunamadı');
                continue;
            }

            $categoryAttributes = [];
            if ($categoryMapping->marketplaceCategory) {
                $storedAttributes = $categoryMapping->marketplaceCategory->attributes;
                if (!empty($storedAttributes)) {
                    $categoryAttributes = $storedAttributes;
                } else {
                    try {
                        $categoryAttributes = $service->getCategoryAttributes(
                            $categoryMapping->marketplaceCategory->marketplace_category_id
                        );
                    } catch (\Exception) {
                    }
                }
            }

            // Fiyat override
            if (!empty($this->priceOverrides)) {
                if (isset($this->priceOverrides[$product->id])) {
                    $newPrice = (float) $this->priceOverrides[$product->id];
                    $product->price = $newPrice;
                    $product->compare_price = $newPrice;
                }
                foreach ($product->variants as $variant) {
                    if (isset($this->priceOverrides[$variant->id])) {
                        $newPrice = (float) $this->priceOverrides[$variant->id];
                        $variant->price = $newPrice;
                        $variant->compare_price = $newPrice;
                    }
                }
            }

            // Min stok filtresi
            if ($this->minStock > 0) {
                $activeVariants = $product->variants->where('is_active', true);

                if ($activeVariants->isNotEmpty()) {
                    $filtered = $activeVariants->filter(fn($v) => $v->stock_quantity > $this->minStock);
                    if ($filtered->isEmpty()) {
                        $this->markProductError($product->id, "Tüm varyantların stoku kritik stok ({$this->minStock}) altında");
                        continue;
                    }
                    $product->setRelation('variants', $filtered->values());
                } else {
                    if ($product->stock_quantity <= $this->minStock) {
                        $this->markProductError($product->id, "Ürün stoku kritik stok ({$this->minStock}) altında");
                        continue;
                    }
                }
            }

            $productItems = $formatter->formatProductItems(
                $product,
                $categoryAttributes,
                $this->deliveryType,
                $this->deliveryMessageType,
            );

            if (empty($productItems)) {
                $this->markProductError($product->id, 'Ürün formatlanamadı');
                continue;
            }

            Log::info('SendCiceksepetiProductsJob: Ürün formatlandı', [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'item_count' => count($productItems),
            ]);

            $items = array_merge($items, array_values($productItems));
            $processedProductIds[] = $product->id;

            $mpProduct = MarketplaceProduct::updateOrCreate(
                [
                    'marketplace' => 'ciceksepeti',
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
                    $stockCode = $variant->sku ?: $variant->barcode ?: ($product->sku ?: $product->barcode) . '-' . $variant->id;
                    $listingData['variants'][$variant->id] = [
                        'stockCode' => $stockCode,
                        'status' => 'pending',
                        'last_synced_at' => now()->toISOString(),
                    ];
                }
                $mpProduct->listing_data = $listingData;
                $mpProduct->save();
            }
        }

        if (empty($items)) {
            Log::warning('SendCiceksepetiProductsJob: Gönderilecek ürün yok', [
                'product_ids' => $this->productIds,
            ]);
            return;
        }

        try {
            $result = $service->createProducts($items);

            $batchId = $result['batchId'] ?? null;
            if ($batchId) {
                MarketplaceProduct::where('marketplace', 'ciceksepeti')
                    ->whereIn('product_id', $processedProductIds)
                    ->update(['batch_request_id' => $batchId]);
            }

            Log::info('SendCiceksepetiProductsJob: Gönderildi', [
                'item_count' => count($items),
                'product_count' => count($processedProductIds),
                'batch_id' => $batchId,
            ]);
        } catch (\Exception $e) {
            Log::error('SendCiceksepetiProductsJob: API hatası', [
                'product_ids' => $this->productIds,
                'error' => $e->getMessage(),
            ]);

            MarketplaceProduct::where('marketplace', 'ciceksepeti')
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
                'marketplace' => 'ciceksepeti',
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
        Log::error('SendCiceksepetiProductsJob failed', [
            'credential_id' => $this->credentialId,
            'product_ids' => $this->productIds,
            'error' => $exception?->getMessage(),
        ]);
    }
}
