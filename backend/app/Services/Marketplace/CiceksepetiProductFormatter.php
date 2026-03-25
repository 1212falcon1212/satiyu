<?php

namespace App\Services\Marketplace;

use App\Models\MarketplaceCategoryMapping;
use App\Models\MarketplaceProduct;
use App\Models\Product;
use App\Models\ProductVariant;

class CiceksepetiProductFormatter
{
    // ==========================================
    // PUBLIC — Ana giriş noktaları
    // ==========================================

    /**
     * Ürünü Çiçeksepeti create formatına çevirir.
     * Varyant yoksa 1 item, varsa N item döner.
     * Her item aynı mainProductCode paylaşır, stockCode farklıdır.
     */
    public function formatProductItems(
        Product $product,
        array $categoryAttributes,
        int $deliveryType = 2,
        int $deliveryMessageType = 5,
    ): array {
        $activeVariants = $product->relationLoaded('variants')
            ? $product->variants->where('is_active', true)
            : $product->variants()->where('is_active', true)->get();

        if ($activeVariants->isEmpty()) {
            return [$this->formatSingleItem($product, $categoryAttributes, $deliveryType, $deliveryMessageType)];
        }

        $items = [];
        foreach ($activeVariants as $variant) {
            $items[] = $this->formatVariantItem(
                $product,
                $variant,
                $categoryAttributes,
                $deliveryType,
                $deliveryMessageType,
            );
        }

        return $items;
    }

    /**
     * Ürünün fiyat/stok güncelleme formatını döner.
     * Varyant yoksa 1 item, varsa N item döner.
     */
    public function formatPriceStockItems(Product $product): array
    {
        $activeVariants = $product->relationLoaded('variants')
            ? $product->variants->where('is_active', true)
            : $product->variants()->where('is_active', true)->get();

        if ($activeVariants->isEmpty()) {
            return [$this->formatForPriceStock($product)];
        }

        $items = [];
        foreach ($activeVariants as $variant) {
            $items[] = $this->formatVariantPriceStock($product, $variant);
        }

        return $items;
    }

    // ==========================================
    // PROTECTED — Tek item formatları
    // ==========================================

    protected function formatSingleItem(
        Product $product,
        array $categoryAttributes,
        int $deliveryType,
        int $deliveryMessageType,
    ): array {
        $images = $product->images->map(fn($img) => $img->image_url)->toArray();
        $attributes = $this->mapAttributes($product, $categoryAttributes);
        $prices = $this->ensurePrices((float) $product->price, (float) ($product->compare_price ?? $product->price));

        $description = $product->description ?? $product->name;
        $description = $this->ensureDescription($description);

        $item = [
            'productName' => $product->name,
            'mainProductCode' => $product->sku ?: $product->barcode,
            'stockCode' => $product->sku ?: $product->barcode,
            'categoryId' => $this->getMarketplaceCategoryId($product),
            'description' => $description,
            'deliveryMessageType' => $deliveryMessageType,
            'deliveryType' => $deliveryType,
            'stockQuantity' => $product->stock_quantity,
            'salesPrice' => $prices['salesPrice'],
            'images' => $images,
            'Attributes' => $attributes,
        ];

        if ($prices['listPrice'] > $prices['salesPrice']) {
            $item['listPrice'] = $prices['listPrice'];
        }

        if (!empty($product->barcode)) {
            $item['barcode'] = $product->barcode;
        }

        return $item;
    }

    // ==========================================
    // PROTECTED — Varyant item formatları
    // ==========================================

    protected function formatVariantItem(
        Product $product,
        ProductVariant $variant,
        array $categoryAttributes,
        int $deliveryType,
        int $deliveryMessageType,
    ): array {
        $variantImages = $variant->relationLoaded('images') ? $variant->images : $variant->images()->get();
        $images = $variantImages->isNotEmpty()
            ? $variantImages->map(fn($img) => $img->image_url)->toArray()
            : $product->images->map(fn($img) => $img->image_url)->toArray();

        $variantPrice = (float) ($variant->price ?? $product->price);
        $variantComparePrice = (float) ($variant->compare_price ?? $product->compare_price ?? $variantPrice);
        $prices = $this->ensurePrices($variantPrice, $variantComparePrice);

        $attributes = $this->mapAttributes($product, $categoryAttributes);
        $variantAttributes = $this->mapVariantAttributes($variant, $categoryAttributes);
        $attributes = array_merge($attributes, $variantAttributes);

        $description = $product->description ?? $product->name;
        $description = $this->ensureDescription($description);

        $stockCode = $variant->sku ?: $variant->barcode ?: ($product->sku ?: $product->barcode) . '-' . $variant->id;

        $item = [
            'productName' => $product->name,
            'mainProductCode' => $product->sku ?: $product->barcode,
            'stockCode' => $stockCode,
            'categoryId' => $this->getMarketplaceCategoryId($product),
            'description' => $description,
            'deliveryMessageType' => $deliveryMessageType,
            'deliveryType' => $deliveryType,
            'stockQuantity' => $variant->stock_quantity,
            'salesPrice' => $prices['salesPrice'],
            'images' => $images,
            'Attributes' => $attributes,
        ];

        if ($prices['listPrice'] > $prices['salesPrice']) {
            $item['listPrice'] = $prices['listPrice'];
        }

        $barcode = $variant->barcode ?: $product->barcode;
        if (!empty($barcode)) {
            $item['barcode'] = $barcode;
        }

        return $item;
    }

    protected function formatForPriceStock(Product $product): array
    {
        $prices = $this->ensurePrices((float) $product->price, (float) ($product->compare_price ?? $product->price));

        $item = [
            'stockCode' => $product->sku ?: $product->barcode,
            'stockQuantity' => $product->stock_quantity,
            'salesPrice' => $prices['salesPrice'],
        ];

        if ($prices['listPrice'] > $prices['salesPrice']) {
            $item['listPrice'] = $prices['listPrice'];
        }

        return $item;
    }

    protected function formatVariantPriceStock(Product $product, ProductVariant $variant): array
    {
        $variantPrice = (float) ($variant->price ?? $product->price);
        $variantComparePrice = (float) ($variant->compare_price ?? $product->compare_price ?? $variantPrice);
        $prices = $this->ensurePrices($variantPrice, $variantComparePrice);

        $stockCode = $variant->sku ?: $variant->barcode ?: ($product->sku ?: $product->barcode) . '-' . $variant->id;

        $item = [
            'stockCode' => $stockCode,
            'stockQuantity' => $variant->stock_quantity,
            'salesPrice' => $prices['salesPrice'],
        ];

        if ($prices['listPrice'] > $prices['salesPrice']) {
            $item['listPrice'] = $prices['listPrice'];
        }

        return $item;
    }

    // ==========================================
    // PROTECTED — Attribute eşleme
    // ==========================================

    /**
     * Sabit (non-variant) required attribute'ları eşler.
     * Çiçeksepeti formatı: [{id, ValueId, TextLength}]
     */
    protected function mapAttributes(Product $product, array $categoryAttributes): array
    {
        $attributes = [];

        foreach ($categoryAttributes as $attr) {
            $type = $attr['type'] ?? '';
            if ($type === 'Variant Özelliği') {
                continue;
            }

            if (!($attr['required'] ?? false)) {
                continue;
            }

            $value = $this->resolveAttributeValue($product, $attr);
            if ($value !== null) {
                $attributes[] = $value;
            }
        }

        return $attributes;
    }

    /**
     * Varyant attribute'larını eşler.
     */
    protected function mapVariantAttributes(ProductVariant $variant, array $categoryAttributes): array
    {
        $attributes = [];

        $variantValues = $variant->relationLoaded('variantValues')
            ? $variant->variantValues
            : $variant->variantValues()->with('variantOption.variantType')->get();

        foreach ($variantValues as $variantValue) {
            $option = $variantValue->variantOption;
            if (!$option) {
                continue;
            }

            $typeName = $option->variantType?->name;
            if (!$typeName) {
                continue;
            }

            $key = $this->turkishLower($typeName);
            $optionValue = $option->value;

            // Kategori attribute'larından eşleşen varianter'ı bul
            foreach ($categoryAttributes as $attr) {
                $attrType = $attr['type'] ?? '';
                if ($attrType !== 'Variant Özelliği') {
                    continue;
                }

                $attrName = $this->turkishLower($attr['attributeName'] ?? '');
                if ($attrName !== $key) {
                    continue;
                }

                $attrId = $attr['attributeId'] ?? null;
                if (!$attrId) {
                    continue;
                }

                $matchedVal = $this->fuzzyMatchAttributeValue($optionValue, $attr['attributeValues'] ?? []);

                if ($matchedVal) {
                    $attributes[] = [
                        'Id' => $attrId,
                        'ValueId' => $matchedVal['id'],
                        'TextLength' => 0,
                    ];
                }
                break;
            }
        }

        return $attributes;
    }

    /**
     * Ürün attribute'unu Çiçeksepeti kategori attribute'u ile eşler.
     */
    protected function resolveAttributeValue(Product $product, array $attr): ?array
    {
        $attrName = $this->turkishLower($attr['attributeName'] ?? '');
        $attrId = $attr['attributeId'] ?? null;
        if (!$attrId) {
            return null;
        }

        $productAttrs = $product->attributes ?? collect();

        foreach ($productAttrs as $pAttr) {
            if ($this->turkishLower($pAttr->attribute_name) === $attrName) {
                $matchedVal = $this->fuzzyMatchAttributeValue($pAttr->attribute_value, $attr['attributeValues'] ?? []);

                if ($matchedVal) {
                    return [
                        'Id' => $attrId,
                        'ValueId' => $matchedVal['id'],
                        'TextLength' => 0,
                    ];
                }

                return null;
            }
        }

        return null;
    }

    // ==========================================
    // PROTECTED — Yardımcılar
    // ==========================================

    protected function getMarketplaceCategoryId(Product $product): ?int
    {
        if (!$product->category_id) {
            return null;
        }

        $mapping = MarketplaceCategoryMapping::where('marketplace', 'ciceksepeti')
            ->where('local_category_id', $product->category_id)
            ->first();

        return $mapping?->marketplaceCategory?->marketplace_category_id;
    }

    /**
     * salesPrice: satış fiyatı, listPrice: üstü çizili fiyat.
     * listPrice >= salesPrice olmalı.
     * Fark %1'den az veya %80'den fazla olmamalı.
     */
    protected function ensurePrices(float $salesPrice, float $listPrice): array
    {
        if ($listPrice < $salesPrice) {
            $listPrice = $salesPrice;
        }

        // Fark kontrolü: %1-%80 arasında olmalı
        if ($listPrice > $salesPrice) {
            $diff = (($listPrice - $salesPrice) / $listPrice) * 100;
            if ($diff < 1) {
                $listPrice = $salesPrice;
            } elseif ($diff > 80) {
                $listPrice = $salesPrice * 1.80;
            }
        }

        return [
            'salesPrice' => round($salesPrice, 2),
            'listPrice' => round($listPrice, 2),
        ];
    }

    /**
     * Açıklama min 30 karakter, max 20000 karakter olmalı.
     */
    protected function ensureDescription(string $description): string
    {
        $plainLength = mb_strlen(strip_tags($description));

        if ($plainLength < 30) {
            $description = $description . str_repeat(' .', max(0, 15 - (int) ($plainLength / 2)));
        }

        if (mb_strlen($description) > 20000) {
            $description = mb_substr($description, 0, 20000);
        }

        return $description;
    }

    protected function turkishLower(string $str): string
    {
        $str = str_replace("\xC4\xB0", 'i', $str);
        $str = mb_strtolower($str, 'UTF-8');
        $str = str_replace("i\xCC\x87", 'i', $str);

        return $str;
    }

    /**
     * Fuzzy attribute value eşleme.
     * Çiçeksepeti attributeValues formatı: [{id, name}]
     */
    protected function fuzzyMatchAttributeValue(string $value, array $acceptedValues): ?array
    {
        $valueLower = $this->turkishLower(trim($value));

        // Exact match
        foreach ($acceptedValues as $val) {
            if ($this->turkishLower($val['name'] ?? '') === $valueLower) {
                return $val;
            }
        }

        // Size aliases
        $sizeAliases = [
            'xxl' => '2xl', 'xxxl' => '3xl', 'xxxxl' => '4xl',
            '2xl' => 'xxl', '3xl' => 'xxxl', '4xl' => 'xxxxl',
            'standart' => 'tek ebat', 'tek ebat' => 'standart',
        ];

        if (isset($sizeAliases[$valueLower])) {
            $alias = $sizeAliases[$valueLower];
            foreach ($acceptedValues as $val) {
                if ($this->turkishLower($val['name'] ?? '') === $alias) {
                    return $val;
                }
            }
        }

        // Parenthesized range: "S (35-38)" → "35-38"
        if (preg_match('/\(([^)]+)\)/', $value, $m)) {
            $inner = $this->turkishLower(trim($m[1]));
            foreach ($acceptedValues as $val) {
                if ($this->turkishLower($val['name'] ?? '') === $inner) {
                    return $val;
                }
            }
        }

        // Compound size: "L Regular" → "L"
        $suffixes = ['regular', 'short', 'long'];
        foreach ($suffixes as $suffix) {
            if (str_ends_with($valueLower, ' ' . $suffix)) {
                $base = trim(mb_substr($valueLower, 0, -mb_strlen($suffix) - 1));
                foreach ($acceptedValues as $val) {
                    if ($this->turkishLower($val['name'] ?? '') === $base) {
                        return $val;
                    }
                }
            }
        }

        return null;
    }
}
