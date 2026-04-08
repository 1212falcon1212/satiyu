<?php

namespace App\Services\Marketplace;

use App\Models\MarketplaceCategoryMapping;
use App\Models\MarketplaceProduct;
use App\Models\Product;
use App\Models\ProductVariant;

class TrendyolProductFormatter
{
    // ==========================================
    // PUBLIC — Ana giriş noktaları
    // ==========================================

    /**
     * Ürünü Trendyol create formatına çevirir.
     * Varyant yoksa 1 item, varsa N item döner.
     */
    public function formatProductItems(
        Product $product,
        array $categoryAttributes,
        int $brandId,
        int $cargoCompanyId,
    ): array {
        $activeVariants = $product->relationLoaded('variants')
            ? $product->variants->where('is_active', true)
            : $product->variants()->where('is_active', true)->get();

        if ($activeVariants->isEmpty()) {
            return [$this->formatSingleItem($product, $categoryAttributes, $brandId, $cargoCompanyId)];
        }

        $variantAttrMap = $this->buildVariantAttributeMap($categoryAttributes);
        $fixedAttributes = $this->mapAttributes($product, $categoryAttributes);
        $productMainId = $product->sku ?: $product->barcode;

        // Collect actual variant type names from product variants
        $variantTypeNames = $activeVariants
            ->flatMap(function ($v) {
                $values = $v->relationLoaded('variantValues')
                    ? $v->variantValues
                    : $v->variantValues()->with('variantOption.variantType')->get();

                return $values->map(fn ($vv) => $this->turkishLower($vv->variantOption?->variantType?->name ?? ''));
            })
            ->filter()
            ->unique()
            ->values()
            ->toArray();

        // Collect which attribute IDs were successfully resolved from variants
        // by checking the first variant (all variants share same types)
        $resolvedAttributeIds = [];
        if ($activeVariants->isNotEmpty()) {
            $firstVariantAttrs = $this->mapVariantAttributes($activeVariants->first(), $categoryAttributes, $variantAttrMap);
            $resolvedAttributeIds = array_map(fn ($a) => $a['attributeId'], $firstVariantAttrs);
        }

        // Resolve slicer/varianter attrs that have no matching variant type
        // OR that exist as variant type but couldn't be matched to Trendyol values
        $unmatchedSlicerAttrs = $this->resolveUnmatchedSlicerAttributes(
            $product, $categoryAttributes, $variantAttrMap, $variantTypeNames, $resolvedAttributeIds
        );
        $fixedAttributes = array_merge($fixedAttributes, $unmatchedSlicerAttrs);

        $items = [];
        foreach ($activeVariants as $variant) {
            $items[] = $this->formatVariantItem(
                $product,
                $variant,
                $productMainId,
                $fixedAttributes,
                $categoryAttributes,
                $variantAttrMap,
                $brandId,
                $cargoCompanyId,
            );
        }

        return $items;
    }

    /**
     * Ürünü Trendyol update formatına çevirir.
     * Varyant yoksa 1 item, varsa N item döner.
     */
    public function formatProductUpdateItems(Product $product, MarketplaceProduct $mpProduct): array
    {
        $activeVariants = $product->relationLoaded('variants')
            ? $product->variants->where('is_active', true)
            : $product->variants()->where('is_active', true)->get();

        if ($activeVariants->isEmpty()) {
            return [$this->formatForUpdate($product, $mpProduct)];
        }

        $items = [];
        foreach ($activeVariants as $variant) {
            $items[] = $this->formatVariantUpdateItem($product, $variant);
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

    /**
     * Geriye uyumluluk: tek ürün create formatı.
     */
    public function formatForCreate(
        Product $product,
        array $categoryAttributes,
        int $brandId,
        int $cargoCompanyId,
    ): array {
        return $this->formatSingleItem($product, $categoryAttributes, $brandId, $cargoCompanyId);
    }

    public function formatForUpdate(Product $product, MarketplaceProduct $mpProduct): array
    {
        $images = $product->images->sortBy('sort_order')->take(6)->map(fn ($img) => ['url' => $img->image_url])->values()->toArray();
        $basePrice = (float) ($product->compare_price ?? $product->price);
        $prices = $this->ensurePrices($basePrice, $basePrice);

        return [
            'barcode' => $product->barcode,
            'title' => $product->name,
            'productMainId' => $product->sku ?: $product->barcode,
            'stockCode' => $product->sku ?: $product->barcode,
            'description' => !empty(trim(strip_tags($product->description ?? ''))) ? $product->description : $product->name,
            'currencyType' => 'TRY',
            'listPrice' => $prices['listPrice'],
            'salePrice' => $prices['salePrice'],
            'vatRate' => (int) ($product->vat_rate ?? 20),
            'images' => $images,
        ];
    }

    public function formatForPriceStock(Product $product): array
    {
        $basePrice = (float) ($product->compare_price ?? $product->price);
        $prices = $this->ensurePrices($basePrice, $basePrice);

        return [
            'barcode' => $product->barcode,
            'quantity' => $product->stock_quantity,
            'salePrice' => $prices['salePrice'],
            'listPrice' => $prices['listPrice'],
        ];
    }

    // ==========================================
    // PUBLIC STATIC — Yardımcı araçlar
    // ==========================================

    /**
     * Ürün isminden renk ve web color tespit eder.
     * Taktik/outdoor, Türkçe ve İngilizce renk sözlüklerini kullanır.
     *
     * @return array{renk: string, webColor: string}|null
     */
    public static function detectColorFromName(string $productName): ?array
    {
        $lower = static::staticTurkishLower($productName);

        // Çok kelimeli terimler önce (daha spesifik)
        $multiWord = [
            'ranger green' => ['renk' => 'Yeşil', 'webColor' => 'Yeşil'],
        ];

        foreach ($multiWord as $keyword => $colors) {
            if (mb_strpos($lower, $keyword) !== false) {
                return $colors;
            }
        }

        // Tek kelimeli terimler — kelime sınırı ile kontrol
        $singleWord = [
            // Taktik/Outdoor
            'desert'    => ['renk' => 'Sarı', 'webColor' => 'Sarı'],
            'coyote'    => ['renk' => 'Bej', 'webColor' => 'Bej'],
            'sage'      => ['renk' => 'Yeşil', 'webColor' => 'Yeşil'],
            'olive'     => ['renk' => 'Yeşil', 'webColor' => 'Yeşil'],
            'tan'       => ['renk' => 'Bej', 'webColor' => 'Bej'],
            'khaki'     => ['renk' => 'Haki', 'webColor' => 'Yeşil'],
            'multicam'  => ['renk' => 'Yeşil', 'webColor' => 'Yeşil'],
            'navy'      => ['renk' => 'Lacivert', 'webColor' => 'Lacivert'],
            // Türkçe
            'siyah'     => ['renk' => 'Siyah', 'webColor' => 'Siyah'],
            'beyaz'     => ['renk' => 'Beyaz', 'webColor' => 'Beyaz'],
            'kirmizi'   => ['renk' => 'Kırmızı', 'webColor' => 'Kırmızı'],
            'mavi'      => ['renk' => 'Mavi', 'webColor' => 'Mavi'],
            'yesil'     => ['renk' => 'Yeşil', 'webColor' => 'Yeşil'],
            'sari'      => ['renk' => 'Sarı', 'webColor' => 'Sarı'],
            'turuncu'   => ['renk' => 'Turuncu', 'webColor' => 'Turuncu'],
            'mor'       => ['renk' => 'Mor', 'webColor' => 'Mor'],
            'pembe'     => ['renk' => 'Pembe', 'webColor' => 'Pembe'],
            'gri'       => ['renk' => 'Gri', 'webColor' => 'Gri'],
            'kahve'     => ['renk' => 'Kahverengi', 'webColor' => 'Kahverengi'],
            'lacivert'  => ['renk' => 'Lacivert', 'webColor' => 'Lacivert'],
            'bej'       => ['renk' => 'Bej', 'webColor' => 'Bej'],
            'krem'      => ['renk' => 'Krem', 'webColor' => 'Krem'],
            'haki'      => ['renk' => 'Haki', 'webColor' => 'Yeşil'],
            'bordo'     => ['renk' => 'Bordo', 'webColor' => 'Bordo'],
            'antrasit'  => ['renk' => 'Antrasit', 'webColor' => 'Gri'],
            // İngilizce
            'black'     => ['renk' => 'Siyah', 'webColor' => 'Siyah'],
            'white'     => ['renk' => 'Beyaz', 'webColor' => 'Beyaz'],
            'red'       => ['renk' => 'Kırmızı', 'webColor' => 'Kırmızı'],
            'blue'      => ['renk' => 'Mavi', 'webColor' => 'Mavi'],
            'green'     => ['renk' => 'Yeşil', 'webColor' => 'Yeşil'],
            'yellow'    => ['renk' => 'Sarı', 'webColor' => 'Sarı'],
            'orange'    => ['renk' => 'Turuncu', 'webColor' => 'Turuncu'],
            'brown'     => ['renk' => 'Kahverengi', 'webColor' => 'Kahverengi'],
            'grey'      => ['renk' => 'Gri', 'webColor' => 'Gri'],
            'gray'      => ['renk' => 'Gri', 'webColor' => 'Gri'],
            'pink'      => ['renk' => 'Pembe', 'webColor' => 'Pembe'],
            'purple'    => ['renk' => 'Mor', 'webColor' => 'Mor'],
            'beige'     => ['renk' => 'Bej', 'webColor' => 'Bej'],
        ];

        foreach ($singleWord as $keyword => $colors) {
            if (preg_match('/\b' . preg_quote($keyword, '/') . '\b/u', $lower)) {
                return $colors;
            }
        }

        return null;
    }

    /**
     * turkishLower'ın static versiyonu — detectColorFromName için.
     */
    protected static function staticTurkishLower(string $str): string
    {
        $str = str_replace("\xC4\xB0", 'i', $str);
        $str = mb_strtolower($str, 'UTF-8');
        $str = str_replace("i\xCC\x87", 'i', $str);

        return $str;
    }

    // ==========================================
    // PROTECTED — Tek item formatları
    // ==========================================

    protected function formatSingleItem(
        Product $product,
        array $categoryAttributes,
        int $brandId,
        int $cargoCompanyId,
    ): array {
        $images = $product->images->sortBy('sort_order')->take(6)->map(fn ($img) => ['url' => $img->image_url])->values()->toArray();
        $attributes = $this->mapAttributes($product, $categoryAttributes);

        // Varyantsız ürünlerde slicer/varianter attribute'ları da
        // product_attributes'dan çözümle (Renk, Beden gibi)
        $variantAttrMap = $this->buildVariantAttributeMap($categoryAttributes);
        $slicerAttrs = $this->resolveUnmatchedSlicerAttributes(
            $product, $categoryAttributes, $variantAttrMap, []
        );
        $attributes = array_merge($attributes, $slicerAttrs);

        $basePrice = (float) ($product->compare_price ?? $product->price);
        $prices = $this->ensurePrices($basePrice, $basePrice);

        return [
            'barcode' => $product->barcode,
            'title' => $product->name,
            'productMainId' => $product->sku ?: $product->barcode,
            'brandId' => $brandId,
            'categoryId' => $this->getMarketplaceCategoryId($product),
            'quantity' => $product->stock_quantity,
            'stockCode' => $product->sku ?: $product->barcode,
            'dimensionalWeight' => $this->calculateDimensionalWeight($product),
            'description' => !empty(trim(strip_tags($product->description ?? ''))) ? $product->description : $product->name,
            'currencyType' => 'TRY',
            'listPrice' => $prices['listPrice'],
            'salePrice' => $prices['salePrice'],
            'vatRate' => (int) ($product->vat_rate ?? 20),
            'cargoCompanyId' => $cargoCompanyId,
            'images' => $images,
            'attributes' => $attributes,
        ];
    }

    // ==========================================
    // PROTECTED — Varyant item formatları
    // ==========================================

    protected function formatVariantItem(
        Product $product,
        ProductVariant $variant,
        string $productMainId,
        array $fixedAttributes,
        array $categoryAttributes,
        array $variantAttrMap,
        int $brandId,
        int $cargoCompanyId,
    ): array {
        $variantImages = $variant->relationLoaded('images') ? $variant->images : $variant->images()->get();
        $images = $variantImages->isNotEmpty()
            ? $variantImages->sortBy('sort_order')->take(6)->map(fn ($img) => ['url' => $img->image_url])->values()->toArray()
            : $product->images->sortBy('sort_order')->take(6)->map(fn ($img) => ['url' => $img->image_url])->values()->toArray();

        $basePrice = (float) ($variant->compare_price ?? $product->compare_price ?? $variant->price ?? $product->price);
        $prices = $this->ensurePrices($basePrice, $basePrice);

        $variantAttributes = $this->mapVariantAttributes($variant, $categoryAttributes, $variantAttrMap);
        $attributes = array_merge($fixedAttributes, $variantAttributes);

        return [
            'barcode' => $variant->barcode ?: $product->barcode,
            'title' => $product->name,
            'productMainId' => $productMainId,
            'brandId' => $brandId,
            'categoryId' => $this->getMarketplaceCategoryId($product),
            'quantity' => $variant->stock_quantity,
            'stockCode' => $variant->sku ?: $variant->barcode ?: $product->sku ?: $product->barcode,
            'dimensionalWeight' => $this->calculateDimensionalWeight($product),
            'description' => !empty(trim(strip_tags($product->description ?? ''))) ? $product->description : $product->name,
            'currencyType' => 'TRY',
            'listPrice' => $prices['listPrice'],
            'salePrice' => $prices['salePrice'],
            'vatRate' => (int) ($product->vat_rate ?? 20),
            'cargoCompanyId' => $cargoCompanyId,
            'images' => $images,
            'attributes' => $attributes,
        ];
    }

    protected function formatVariantUpdateItem(Product $product, ProductVariant $variant): array
    {
        $variantImages = $variant->relationLoaded('images') ? $variant->images : $variant->images()->get();
        $images = $variantImages->isNotEmpty()
            ? $variantImages->sortBy('sort_order')->take(6)->map(fn ($img) => ['url' => $img->image_url])->values()->toArray()
            : $product->images->sortBy('sort_order')->take(6)->map(fn ($img) => ['url' => $img->image_url])->values()->toArray();

        $basePrice = (float) ($variant->compare_price ?? $product->compare_price ?? $variant->price ?? $product->price);
        $prices = $this->ensurePrices($basePrice, $basePrice);

        return [
            'barcode' => $variant->barcode ?: $product->barcode,
            'title' => $product->name,
            'productMainId' => $product->sku ?: $product->barcode,
            'stockCode' => $variant->sku ?: $variant->barcode ?: $product->sku ?: $product->barcode,
            'description' => !empty(trim(strip_tags($product->description ?? ''))) ? $product->description : $product->name,
            'currencyType' => 'TRY',
            'listPrice' => $prices['listPrice'],
            'salePrice' => $prices['salePrice'],
            'vatRate' => (int) ($product->vat_rate ?? 20),
            'images' => $images,
        ];
    }

    protected function formatVariantPriceStock(Product $product, ProductVariant $variant): array
    {
        $basePrice = (float) ($variant->compare_price ?? $product->compare_price ?? $variant->price ?? $product->price);
        $prices = $this->ensurePrices($basePrice, $basePrice);

        return [
            'barcode' => $variant->barcode ?: $product->barcode,
            'quantity' => $variant->stock_quantity,
            'salePrice' => $prices['salePrice'],
            'listPrice' => $prices['listPrice'],
        ];
    }

    // ==========================================
    // PROTECTED — Attribute eşleme
    // ==========================================

    /**
     * Sabit (non-slicer, non-varianter) required attribute'ları eşler.
     */
    protected function mapAttributes(Product $product, array $categoryAttributes): array
    {
        $attributes = [];

        foreach ($categoryAttributes as $attr) {
            if (($attr['slicer'] ?? false) || ($attr['varianter'] ?? false)) {
                continue;
            }

            if (! ($attr['required'] ?? false)) {
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
     * Varyant attribute'larını (slicer/varianter) eşler.
     */
    protected function mapVariantAttributes(
        ProductVariant $variant,
        array $categoryAttributes,
        array $variantAttrMap,
    ): array {
        $attributes = [];

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

            $key = $this->turkishLower($typeName);
            $optionValue = $option->value;

            if (! isset($variantAttrMap[$key])) {
                continue;
            }

            $mapEntry = $variantAttrMap[$key];

            $matchedVal = $this->fuzzyMatchAttributeValue($optionValue, $mapEntry['values']);

            if ($matchedVal) {
                $attributes[] = [
                    'attributeId' => $mapEntry['attributeId'],
                    'attributeValueId' => $matchedVal['id'],
                ];
            } elseif ($mapEntry['allowCustom'] ?? false) {
                $attributes[] = [
                    'attributeId' => $mapEntry['attributeId'],
                    'customAttributeValue' => $optionValue,
                ];
            }
        }

        return $attributes;
    }

    /**
     * Kategori attribute'larından slicer/varianter olanları map olarak döner.
     * Anahtar: turkishLower(attribute adı)
     */
    protected function buildVariantAttributeMap(array $categoryAttributes): array
    {
        $map = [];

        foreach ($categoryAttributes as $attr) {
            if (! (($attr['slicer'] ?? false) || ($attr['varianter'] ?? false))) {
                continue;
            }

            $attrId = $attr['attribute']['id'] ?? $attr['id'] ?? null;
            $attrName = $attr['attribute']['name'] ?? $attr['name'] ?? '';

            if (! $attrId) {
                continue;
            }

            $key = $this->turkishLower($attrName);
            $map[$key] = [
                'attributeId' => $attrId,
                'allowCustom' => $attr['allowCustom'] ?? false,
                'values' => $attr['attributeValues'] ?? [],
            ];
        }

        return $map;
    }

    /**
     * Slicer/varianter olup ürün varyant tiplerine karşılığı olmayan attribute'ları
     * product_attributes tablosundan çözümler. Örn: tek renkli ürünlerde "Renk" slicer
     * olmasına rağmen varyant tipi olarak "beden" kullanılıyorsa, Renk değeri
     * product_attributes'dan alınır ve sabit olarak tüm varyantlara eklenir.
     */
    protected function resolveUnmatchedSlicerAttributes(
        Product $product,
        array $categoryAttributes,
        array $variantAttrMap,
        array $variantTypeNames,
        array $resolvedAttributeIds = [],
    ): array {
        $attributes = [];

        foreach ($variantAttrMap as $key => $mapEntry) {
            // Bu slicer/varianter attribute, ürünün bir varyant tipine karşılık geliyorsa
            // VE mapVariantAttributes tarafından başarıyla çözümlendiyse — atla.
            if (in_array($key, $variantTypeNames) && in_array($mapEntry['attributeId'], $resolvedAttributeIds)) {
                continue;
            }

            // Eşleşme yok veya varyant eşleşemedi — product_attributes'dan çözümlemeyi dene
            foreach ($categoryAttributes as $attr) {
                $attrName = $this->turkishLower($attr['attribute']['name'] ?? $attr['name'] ?? '');
                if ($attrName !== $key) {
                    continue;
                }

                $value = $this->resolveAttributeValue($product, $attr);
                if ($value !== null) {
                    $attributes[] = $value;
                }
                break;
            }
        }

        return $attributes;
    }

    /**
     * Ürün attribute'unu Trendyol kategori attribute'u ile eşler.
     */
    protected function resolveAttributeValue(Product $product, array $attr): ?array
    {
        $attrName = $this->turkishLower($attr['attribute']['name'] ?? $attr['name'] ?? '');
        $productAttrs = $product->attributes ?? collect();

        foreach ($productAttrs as $pAttr) {
            if ($this->turkishLower($pAttr->attribute_name) === $attrName) {
                $values = $attr['attributeValues'] ?? [];
                $attrId = $attr['attribute']['id'] ?? $attr['id'];

                $matchedVal = $this->fuzzyMatchAttributeValue($pAttr->attribute_value, $values);

                if ($matchedVal) {
                    return [
                        'attributeId' => $attrId,
                        'attributeValueId' => $matchedVal['id'],
                    ];
                }

                if ($attr['allowCustom'] ?? false) {
                    return [
                        'attributeId' => $attrId,
                        'customAttributeValue' => $pAttr->attribute_value,
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
        if (! $product->category_id) {
            return null;
        }

        $mapping = MarketplaceCategoryMapping::where('marketplace', 'trendyol')
            ->where('local_category_id', $product->category_id)
            ->first();

        return $mapping?->marketplaceCategory?->marketplace_category_id;
    }

    /**
     * listPrice her zaman salePrice'tan büyük veya eşit olmalı.
     * Trendyol "TSF PSF den büyük olamaz" hatası verir aksi halde.
     */
    protected function ensurePrices(float $salePrice, float $listPrice): array
    {
        if ($listPrice < $salePrice) {
            $listPrice = $salePrice;
        }

        return ['salePrice' => $salePrice, 'listPrice' => $listPrice];
    }

    protected function calculateDimensionalWeight(Product $product): float
    {
        if ($product->desi !== null && $product->desi > 0) {
            return (float) $product->desi;
        }

        $width = (float) ($product->width ?? 1);
        $height = (float) ($product->height ?? 1);
        $length = (float) ($product->length ?? 1);

        return round(($width * $height * $length) / 3000, 2);
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

    /**
     * Beden/size değerini Trendyol'un kabul ettiği listeye eşleştirmeye çalışır.
     * Exact match bulunamazsa normalizasyon yapar:
     * - XXL → 2XL, XXXL → 3XL, XXXXL → 4XL
     * - "L Regular", "L Short", "L Long" → "L"
     * - "Standart" ↔ "Tek Ebat"
     *
     * @return array|null  ['id' => ..., 'name' => ...] veya null
     */
    protected function fuzzyMatchAttributeValue(string $value, array $acceptedValues): ?array
    {
        $valueLower = $this->turkishLower(trim($value));

        // 1. Exact match
        foreach ($acceptedValues as $val) {
            if ($this->turkishLower($val['name'] ?? '') === $valueLower) {
                return $val;
            }
        }

        // 2. Parenthesized range: "S (35-38)" → try "35-38", "M ( 39-42)" → try "39-42"
        if (preg_match('/\(([^)]+)\)/', $value, $m)) {
            $inner = trim($m[1]);
            $innerLower = $this->turkishLower($inner);
            foreach ($acceptedValues as $val) {
                if ($this->turkishLower($val['name'] ?? '') === $innerLower) {
                    return $val;
                }
            }
            // Also try with separator normalization on the inner value
            $innerNormalized = str_replace(' ', '', $innerLower);
            foreach ($acceptedValues as $val) {
                $accepted = str_replace(' ', '', $this->turkishLower($val['name'] ?? ''));
                if ($accepted === $innerNormalized) {
                    return $val;
                }
            }
        }

        // 3. Size aliases: XXL→2XL, XXXL→3XL, XXXXL→4XL
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

        // 3. Compound size: "L Regular" → "L", "S Short" → "S", "XL Long" → "XL"
        $suffixes = ['regular', 'short', 'long', 'r', 's', 'l'];
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

        // 4. Separator normalization: "30X32" → "30/32", "30-32", "30 32", "30 x 32"
        $separators = ['x', '/', '-', ' '];
        $currentSep = null;
        foreach ($separators as $sep) {
            if (str_contains($valueLower, $sep)) {
                $currentSep = $sep;
                break;
            }
        }

        if ($currentSep !== null) {
            $parts = explode($currentSep, $valueLower, 2);
            if (count($parts) === 2) {
                $left = trim($parts[0]);
                $right = trim($parts[1]);
                $alternatives = [
                    $left . '/' . $right,
                    $left . '-' . $right,
                    $left . ' ' . $right,
                    $left . 'x' . $right,
                    $left . ' x ' . $right,
                ];
                foreach ($alternatives as $alt) {
                    if ($alt === $valueLower) {
                        continue;
                    }
                    foreach ($acceptedValues as $val) {
                        if ($this->turkishLower($val['name'] ?? '') === $alt) {
                            return $val;
                        }
                    }
                }
            }
        }

        return null;
    }
}
