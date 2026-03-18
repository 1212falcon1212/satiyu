<?php

namespace App\Services\Marketplace;

use App\Models\MarketplaceCategoryMapping;
use App\Models\MarketplaceProduct;
use App\Models\Product;
use App\Models\ProductVariant;

class HepsiburadaProductFormatter
{
    /**
     * Ürünü HB create formatına çevirir.
     * Varyant yoksa 1 item, varsa N item döner.
     */
    public function formatProductItems(
        Product $product,
        array $categoryAttributes,
        string $merchantId = '',
    ): array {
        $activeVariants = $product->relationLoaded('variants')
            ? $product->variants->where('is_active', true)
            : $product->variants()->where('is_active', true)->get();

        if ($activeVariants->isEmpty()) {
            $item = $this->formatSingleItem($product, $categoryAttributes, $merchantId);

            return ! empty($item) ? [$item] : [];
        }

        $productMainId = $product->sku ?? $product->barcode;

        $items = [];
        foreach ($activeVariants as $variant) {
            $item = $this->formatVariantItem(
                $product,
                $variant,
                $productMainId,
                $categoryAttributes,
                $merchantId,
            );
            if (! empty($item)) {
                $items[] = $item;
            }
        }

        return $items;
    }

    /**
     * Geriye uyumluluk: tek ürün create formatı.
     */
    public function formatForCreate(
        Product $product,
        array $categoryAttributes,
        string $merchantId = '',
    ): array {
        return $this->formatSingleItem($product, $categoryAttributes, $merchantId);
    }

    public function formatForPriceStock(Product $product, MarketplaceProduct $mpProduct): array
    {
        $basePrice = (float) ($product->compare_price ?? $product->price);

        return [
            'merchantSku' => $this->generateMerchantSku($product),
            'barcode' => $product->barcode,
            'price' => $this->formatPrice($basePrice),
            'stock' => (string) $product->stock_quantity,
        ];
    }

    /**
     * Stok sync için ürün + varyant bazında item listesi döner.
     * Her item: merchantSku, barcode, stock (int), price (string)
     */
    public function formatPriceStockItems(Product $product): array
    {
        $activeVariants = $product->relationLoaded('variants')
            ? $product->variants->where('is_active', true)
            : $product->variants()->where('is_active', true)->get();

        if ($activeVariants->isEmpty()) {
            $sku = $product->sku ?? $product->barcode ?? (string) $product->id;
            $merchantSku = strtoupper(preg_replace('/[^A-Za-z0-9_-]/', '', $sku));

            return [[
                'merchantSku' => $merchantSku,
                'barcode' => $product->barcode,
                'stock' => (int) $product->stock_quantity,
                'price' => $this->formatPrice((float) ($product->compare_price ?? $product->price)),
            ]];
        }

        $items = [];
        foreach ($activeVariants as $variant) {
            $variantSku = $variant->sku ?? $variant->barcode ?? $product->sku ?? $product->barcode;
            $merchantSku = strtoupper(preg_replace('/[^A-Za-z0-9_-]/', '', $variantSku));

            $items[] = [
                'merchantSku' => $merchantSku,
                'barcode' => $variant->barcode ?: $product->barcode,
                'stock' => (int) $variant->stock_quantity,
                'price' => $this->formatPrice((float) ($variant->compare_price ?? $product->compare_price ?? $variant->price ?? $product->price)),
            ];
        }

        return $items;
    }

    // ==========================================
    // PROTECTED — Tek item formatları
    // ==========================================

    protected function formatSingleItem(
        Product $product,
        array $categoryAttributes,
        string $merchantId = '',
    ): array {
        $merchantSku = $this->generateMerchantSku($product);
        $productName = $this->formatProductName($product);
        $images = $this->formatImages($product);

        $categoryId = $this->getMarketplaceCategoryId($product);
        if (! $categoryId) {
            return [];
        }

        $attributes = [
            'merchantSku' => $merchantSku,
            'VaryantGroupID' => $product->sku ?? $product->barcode,
            'Barcode' => $product->barcode,
            'UrunAdi' => $productName,
            'UrunAciklamasi' => $product->description ?? $productName,
            'Marka' => $product->brand?->name ?? '',
            'GarantiSuresi' => '24',
            'kg' => $this->formatWeight($product),
            'tax_vat_rate' => (string) ($product->vat_rate ?: 10),
            'price' => $this->formatPrice((float) ($product->compare_price ?? $product->price)),
            'stock' => (string) $product->stock_quantity,
        ];

        // Görseller
        foreach ($images as $index => $url) {
            $key = 'Image' . ($index + 1);
            $attributes[$key] = $url;
        }

        // Kategori özelliklerini stored product attributes'dan çöz
        foreach ($categoryAttributes as $attr) {
            $value = $this->resolveStoredAttribute($product, $attr);
            if ($value !== null) {
                $attrId = $attr['id'] ?? $attr['attributeId'] ?? '';
                if ($attrId) {
                    $attributes[$attrId] = $value;
                }
            }
        }

        $item = [
            'categoryId' => $categoryId,
            'merchant' => $merchantId,
            'attributes' => $attributes,
        ];

        return $item;
    }

    // ==========================================
    // PROTECTED — Varyant item formatları
    // ==========================================

    protected function formatVariantItem(
        Product $product,
        ProductVariant $variant,
        string $productMainId,
        array $categoryAttributes,
        string $merchantId = '',
    ): array {
        $categoryId = $this->getMarketplaceCategoryId($product);
        if (! $categoryId) {
            return [];
        }

        $variantImages = $variant->relationLoaded('images') ? $variant->images : $variant->images()->get();
        $images = $variantImages->isNotEmpty()
            ? $variantImages->sortBy('sort_order')->take(5)->pluck('image_url')->values()->toArray()
            : $this->formatImages($product);

        $productName = $this->formatProductName($product);
        $variantSku = $variant->sku ?? $variant->barcode ?? $product->sku ?? $product->barcode;
        $merchantSku = strtoupper(preg_replace('/[^A-Za-z0-9_-]/', '', $variantSku));

        $attributes = [
            'merchantSku' => $merchantSku,
            'VaryantGroupID' => $productMainId,
            'Barcode' => $variant->barcode ?: $product->barcode,
            'UrunAdi' => $productName,
            'UrunAciklamasi' => $product->description ?? $productName,
            'Marka' => $product->brand?->name ?? '',
            'GarantiSuresi' => '24',
            'kg' => $this->formatWeight($product),
            'tax_vat_rate' => (string) ($product->vat_rate ?: 10),
            'price' => $this->formatPrice((float) ($variant->compare_price ?? $product->compare_price ?? $variant->price ?? $product->price)),
            'stock' => (string) $variant->stock_quantity,
        ];

        // Görseller
        foreach ($images as $index => $url) {
            $key = 'Image' . ($index + 1);
            $attributes[$key] = $url;
        }

        // Varyant değerlerini attribute olarak ekle
        $variantValues = $variant->relationLoaded('variantValues')
            ? $variant->variantValues
            : $variant->variantValues()->with('variantOption.variantType')->get();

        foreach ($variantValues as $variantValue) {
            $option = $variantValue->variantOption;
            if (! $option) {
                continue;
            }

            $typeName = $option->variantType?->name;
            if (! $typeName) {
                continue;
            }

            // HB'de varyant attribute'ları, variantAttributes grubundaki attribute id'leri ile eşleştirilir
            $matchedAttr = $this->findVariantAttribute($categoryAttributes, $typeName);
            if ($matchedAttr) {
                $attrId = $matchedAttr['id'] ?? $matchedAttr['attributeId'] ?? '';
                if ($attrId) {
                    // Değeri HB'nin kabul ettiği enum değerine normalize et
                    $normalizedValue = $this->normalizeAttributeValue($option->value, $matchedAttr);
                    $attributes[$attrId] = $normalizedValue;
                }
            }
        }

        // Stored product attributes (non-variant + variantAttributes fallback)
        foreach ($categoryAttributes as $attr) {
            $attrId = $attr['id'] ?? $attr['attributeId'] ?? '';
            if (! $attrId || isset($attributes[$attrId])) {
                continue;
            }
            $value = $this->resolveStoredAttribute($product, $attr);
            if ($value !== null) {
                $attributes[$attrId] = $value;
            }
        }

        $item = [
            'categoryId' => $categoryId,
            'merchant' => $merchantId,
            'attributes' => $attributes,
        ];

        return $item;
    }

    // ==========================================
    // PROTECTED — Attribute çözümleme
    // ==========================================

    /**
     * ProductAttribute tablosundan attribute_name eşleşmesi ile değer bulur.
     */
    protected function resolveStoredAttribute(Product $product, array $attr): ?string
    {
        $attrName = $this->turkishLower($attr['name'] ?? '');
        if (! $attrName) {
            return null;
        }

        $productAttrs = $product->relationLoaded('attributes')
            ? $product->attributes
            : $product->attributes()->get();

        foreach ($productAttrs as $pAttr) {
            if ($this->turkishLower($pAttr->attribute_name) === $attrName) {
                return $pAttr->attribute_value;
            }
        }

        return null;
    }

    /**
     * Varyant tipi adına göre categoryAttributes içinde eşleşen variantAttributes grubundaki attribute'u bulur.
     * Alias eşleştirmesi destekler (örn: "beden" → "Ayakkabı Numarası").
     */
    protected function findVariantAttribute(array $categoryAttributes, string $variantTypeName): ?array
    {
        $typeLower = $this->turkishLower($variantTypeName);

        // Bizim varyant tipi → HB'nin hangi özellik adlarına karşılık gelebilir
        $reverseAliasMap = [
            'beden' => ['beden', 'numara', 'ayakkabı numarası', 'eu numara', 'bot numarası', 'çizme numarası', 'terlik numarası', 'sandalet numarası', 'giysi bedeni'],
            'numara' => ['numara', 'ayakkabı numarası', 'eu numara', 'bot numarası'],
            'renk' => ['renk'],
            'color' => ['renk'],
        ];

        $possibleNames = $reverseAliasMap[$typeLower] ?? [$typeLower];

        foreach ($categoryAttributes as $attr) {
            $group = $attr['_group'] ?? '';
            if ($group !== 'variantAttributes') {
                continue;
            }

            $attrName = $this->turkishLower($attr['name'] ?? '');
            if (in_array($attrName, $possibleNames, true)) {
                return $attr;
            }
        }

        return null;
    }

    // ==========================================
    // PROTECTED — Yardımcılar
    // ==========================================

    protected function generateMerchantSku(Product $product): string
    {
        $sku = $product->sku ?? $product->barcode ?? (string) $product->id;

        return strtoupper(preg_replace('/[^A-Za-z0-9_-]/', '', $sku));
    }

    protected function formatProductName(Product $product): string
    {
        $brandName = $product->brand?->name ?? '';
        $name = $product->name;

        // Marka adi ile baslamali (case-insensitive kontrol)
        if ($brandName && mb_stripos($name, $brandName) !== 0) {
            $name = $brandName . ' ' . $name;
        }

        return mb_convert_case($name, MB_CASE_TITLE, 'UTF-8');
    }

    protected function formatPrice(float $price): string
    {
        return number_format($price, 2, ',', '');
    }

    protected function formatWeight(Product $product): string
    {
        if ($product->desi && $product->desi > 0) {
            return (string) $product->desi;
        }

        if ($product->weight && $product->weight > 0) {
            return number_format($product->weight, 2, ',', '');
        }

        return '1';
    }

    protected function formatImages(Product $product): array
    {
        return $product->images
            ->sortBy('sort_order')
            ->take(5)
            ->pluck('image_url')
            ->values()
            ->toArray();
    }

    protected function getMarketplaceCategoryId(Product $product): ?int
    {
        if (!$product->category_id) {
            return null;
        }

        $mapping = MarketplaceCategoryMapping::where('marketplace', 'hepsiburada')
            ->where('local_category_id', $product->category_id)
            ->first();

        return $mapping?->marketplaceCategory?->marketplace_category_id;
    }

    /**
     * Varyant/attribute değerini HB'nin kabul ettiği enum değerine normalize eder.
     * Önce exact match, sonra case-insensitive, sonra fuzzy match dener.
     */
    protected function normalizeAttributeValue(string $value, array $attr): string
    {
        $allowedValues = $attr['values'] ?? [];
        if (empty($allowedValues)) {
            return mb_convert_case($value, MB_CASE_TITLE, 'UTF-8');
        }

        // Allowed values listesini düzleştir
        $enumValues = array_map(fn($v) => is_array($v) ? ($v['value'] ?? '') : (string) $v, $allowedValues);
        $enumValues = array_filter($enumValues);

        $valueLower = $this->turkishLower(trim($value));

        // 1. Exact match
        foreach ($enumValues as $enum) {
            if ($this->turkishLower($enum) === $valueLower) {
                return $enum;
            }
        }

        // 2. Alias mapping (bizim DB değeri → HB değeri)
        $colorAliases = [
            'light yesil' => ['Açık Yeşil', 'Fıstık Yeşili'],
            'light yeşil' => ['Açık Yeşil', 'Fıstık Yeşili'],
            'açık yeşil' => ['Açık Yeşil'],
            'klasik yeşil' => ['Yeşil', 'Koyu Yeşil'],
            'klasik yesil' => ['Yeşil', 'Koyu Yeşil'],
            'koyu yesil' => ['Koyu Yeşil'],
            'koyu yeşil' => ['Koyu Yeşil'],
            'yesil' => ['Yeşil'],
            'yeşil' => ['Yeşil'],
            'mavi' => ['Mavi'],
            'koyu mavi' => ['Koyu Mavi', 'Lacivert'],
            'açık mavi' => ['Açık Mavi'],
            'lacivert' => ['Lacivert'],
            'siyah' => ['Siyah'],
            'beyaz' => ['Beyaz'],
            'kırmızı' => ['Kırmızı'],
            'kirmizi' => ['Kırmızı'],
            'turuncu' => ['Turuncu'],
            'sarı' => ['Sarı'],
            'sari' => ['Sarı'],
            'pembe' => ['Pembe'],
            'mor' => ['Mor'],
            'gri' => ['Gri'],
            'kahverengi' => ['Kahverengi'],
            'kahve' => ['Kahverengi'],
            'bej' => ['Bej'],
            'krem' => ['Krem'],
            'haki' => ['Haki'],
            'füme' => ['Füme'],
            'antrasit' => ['Antrasit'],
            'bordo' => ['Bordo'],
            'turkuaz' => ['Turkuaz'],
            'ekru' => ['Ekru'],
        ];

        $candidates = $colorAliases[$valueLower] ?? [];
        foreach ($candidates as $candidate) {
            if (in_array($candidate, $enumValues, true)) {
                return $candidate;
            }
        }

        // 3. Substring match — HB enum değerlerinde aranan kelime geçiyor mu
        foreach ($enumValues as $enum) {
            if (mb_stripos($enum, trim($value)) !== false || mb_stripos(trim($value), $enum) !== false) {
                return $enum;
            }
        }

        // 4. Bulunamazsa Title Case formatında gönder
        return mb_convert_case(trim($value), MB_CASE_TITLE, 'UTF-8');
    }

    /**
     * Türkçe İ/I karakter sorununu çözerek lowercase yapar.
     */
    protected function turkishLower(string $str): string
    {
        $str = str_replace("\xC4\xB0", 'i', $str);
        $str = mb_strtolower($str, 'UTF-8');
        $str = str_replace("i\xCC\x87", 'i', $str);

        return $str;
    }
}
