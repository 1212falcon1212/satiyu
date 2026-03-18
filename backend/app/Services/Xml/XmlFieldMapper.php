<?php

namespace App\Services\Xml;

class XmlFieldMapper
{
    protected array $fieldMap;
    protected ?string $productNode;
    protected ?string $wrapperNode;

    protected array $defaultFieldMap = [
        'sku' => ['stockCode', 'stokKodu', 'sku', 'product_code', 'urunKodu', 'productCode'],
        'barcode' => ['barcode', 'barkod', 'eanCode', 'ean', 'gtinBarcode'],
        'name' => ['title', 'name', 'baslik', 'urunAdi', 'product_name', 'productName', 'label', 'etiket'],
        'description' => ['description', 'aciklama', 'desc', 'urunAciklama', 'details', 'detay'],
        'short_description' => ['shortDescription', 'kisaAciklama', 'short_desc'],
        'price' => ['price', 'fiyat', 'salePrice', 'satisFiyati', 'buyingPrice', 'alisFiyati', 'price1'],
        'compare_price' => ['listPrice', 'listeFiyati', 'oldPrice', 'eskiFiyat', 'comparePrice', 'marketPrice', 'piyasaFiyati'],
        'cost_price' => ['costPrice', 'maliyet', 'cost'],
        'stock_quantity' => ['quantity', 'stock', 'stok', 'miktar', 'adet', 'stockAmount', 'stokMiktari'],
        'category' => ['mainCategory', 'anaKategori', 'main_category', 'category', 'kategori', 'categoryPath', 'kategoriYolu', 'KategoriYolu'],
        'subcategory' => ['top_category', 'topCategory', 'subCategory', 'altKategori', 'sub_category'],
        'subcategory_2' => ['sub_category', 'sub_category_2', 'subCategory2', 'altKategori2'],
        'subcategory_3' => ['sub_category_2', 'sub_category_3', 'subCategory3', 'altKategori3'],
        'subcategory_4' => ['sub_category_3', 'sub_category_4', 'subCategory4', 'altKategori4'],
        'brand' => ['brand', 'marka', 'brandName', 'markaAdi'],
        'weight' => ['weight', 'agirlik', 'dimensionalWeight'],
        'desi' => ['dm3', 'desi', 'desiWeight', 'dimensionalWeight'],
        'currency' => ['currency', 'paraBirimi', 'currencyType', 'currencyAbbr', 'dovizTipi'],
        'tax' => ['tax', 'kdv', 'vergi', 'taxRate'],
    ];

    public function __construct(array $mappingConfig = [])
    {
        $this->fieldMap = $mappingConfig['field_map'] ?? [];
        $this->productNode = $mappingConfig['product_node'] ?? null;
        $this->wrapperNode = $mappingConfig['wrapper_node'] ?? null;
    }

    public function map(array $rawXmlData): array
    {
        $mapped = [];

        foreach ($this->defaultFieldMap as $targetField => $defaultSourceFields) {
            // Custom mapping oncelikli
            if (isset($this->fieldMap[$targetField]) && $this->fieldMap[$targetField] !== '') {
                $customSource = $this->fieldMap[$targetField];
                $value = $this->findFieldCaseInsensitive($rawXmlData, $customSource);
                if ($value !== null) {
                    $mapped[$targetField] = $value;
                    continue;
                }
            }

            // Default mapping'lerden eşleştir
            foreach ($defaultSourceFields as $sourceField) {
                $value = $this->findFieldCaseInsensitive($rawXmlData, $sourceField);
                if ($value !== null) {
                    $mapped[$targetField] = $value;
                    break;
                }
            }
        }

        // Build _category_parts from all mapped category levels
        // First: check if category field itself contains a path with separators
        $pathFromSingleField = false;
        if (!empty($mapped['category'])) {
            $catValue = $mapped['category'];
            $separators = ['>', '/', '|'];
            foreach ($separators as $sep) {
                if (str_contains($catValue, $sep)) {
                    $parts = array_values(array_filter(
                        array_map('trim', explode($sep, $catValue)),
                        fn ($p) => $p !== '',
                    ));
                    if (count($parts) >= 2) {
                        $mapped['_category_parts'] = $parts;
                        $mapped['category'] = $parts[0];
                        $mapped['subcategory'] = $parts[1] ?? null;
                        $pathFromSingleField = true;
                    }
                    break;
                }
            }
        }

        // Second: if no path separator found, build from separate category fields
        if (!$pathFromSingleField) {
            $categoryLevels = ['category', 'subcategory', 'subcategory_2', 'subcategory_3', 'subcategory_4'];
            $parts = [];
            foreach ($categoryLevels as $level) {
                $val = trim($mapped[$level] ?? '');
                if ($val !== '' && !in_array($val, $parts, true)) {
                    $parts[] = $val;
                }
            }
            if (count($parts) >= 2) {
                $mapped['_category_parts'] = $parts;
            }
        }

        return $mapped;
    }

    public function getTargetFields(): array
    {
        return array_keys($this->defaultFieldMap);
    }

    public function getProductNode(): ?string
    {
        return $this->productNode;
    }

    public function getWrapperNode(): ?string
    {
        return $this->wrapperNode;
    }

    public function mapVariants(array $rawProduct): array
    {
        $variants = [];

        // Find variants node from multiple possible names
        $variantNodeNames = ['variants', 'stoklar', 'Stoklar', 'subProducts', 'altUrunler', 'details', 'detaylar'];
        $variantsData = null;
        foreach ($variantNodeNames as $nodeName) {
            $found = $this->findFieldCaseInsensitive($rawProduct, $nodeName);
            if (is_array($found)) {
                $variantsData = $found;
                break;
            }
        }

        if (!is_array($variantsData)) {
            return [];
        }

        // variants could have a 'variant' key with array of variants
        $variantList = $variantsData['variant'] ?? $variantsData;

        // Ensure it's a list of variants (not a single variant)
        if (!empty($variantList) && !isset($variantList[0]) && ($this->findVariantField($variantList, ['vStockCode', 'stockCode', 'stokKodu', 'variantCode', 'vBarcode']) !== null)) {
            $variantList = [$variantList];
        }

        if (!isset($variantList[0])) {
            return [];
        }

        foreach ($variantList as $v) {
            if (!is_array($v)) {
                continue;
            }

            $variant = [
                'sku' => $this->findVariantField($v, ['vStockCode', 'vSku', 'vKod', 'stockCode', 'stokKodu', 'variantCode', 'productCode']),
                'barcode' => $this->findVariantField($v, ['vBarcode', 'vBarkod', 'barcode', 'barkod']),
                'stock' => (int) ($this->findVariantField($v, ['vStockAmount', 'vStock', 'vStok', 'vMiktar', 'stock', 'stok', 'miktar', 'quantity', 'adet']) ?? 0),
                'price' => $this->findVariantField($v, ['vBuyingPrice', 'vPrice', 'vFiyat', 'price', 'fiyat', 'salePrice', 'sitePrice']),
                'images' => [],
                'options' => [],
            ];

            // Extract variant images: vPicture1Path ... vPicture8Path
            for ($i = 1; $i <= 8; $i++) {
                $imgUrl = $this->findVariantField($v, ["vPicture{$i}Path", "vPicture{$i}", "vImage{$i}"]);
                if ($imgUrl && filter_var($imgUrl, FILTER_VALIDATE_URL)) {
                    $variant['images'][] = $imgUrl;
                }
            }

            // Extract variant options
            $options = $this->findVariantField($v, ['options']);
            if (is_array($options)) {
                $optionList = $options['option'] ?? $options;
                if (!empty($optionList) && !isset($optionList[0]) && isset($optionList['variantName'])) {
                    $optionList = [$optionList];
                }
                if (isset($optionList[0])) {
                    foreach ($optionList as $opt) {
                        if (!is_array($opt)) {
                            continue;
                        }
                        $typeName = $this->findVariantField($opt, ['variantName', 'optionName', 'type', 'Beden', 'Renk', 'size', 'color', 'boyut']);
                        $typeValue = $this->findVariantField($opt, ['variantValue', 'optionValue', 'value']);
                        if ($typeName && $typeValue) {
                            $variant['options'][] = [
                                'type' => trim((string) $typeName),
                                'value' => trim((string) $typeValue),
                            ];
                        }
                    }
                }
            }

            // Fallback: if no options found but there are direct variantName/variantValue fields
            if (empty($variant['options'])) {
                $typeName = $this->findVariantField($v, ['variantName', 'optionName']);
                $typeValue = $this->findVariantField($v, ['variantValue', 'optionValue']);
                if ($typeName && $typeValue) {
                    $variant['options'][] = [
                        'type' => trim((string) $typeName),
                        'value' => trim((string) $typeValue),
                    ];
                }
            }

            // Fallback: name1/value1, name2/value2 pattern (common in Turkish XML feeds)
            if (empty($variant['options'])) {
                for ($n = 1; $n <= 5; $n++) {
                    $typeName = $this->findVariantField($v, ["name{$n}"]);
                    $typeValue = $this->findVariantField($v, ["value{$n}"]);
                    if ($typeName && $typeValue && trim((string) $typeName) !== '' && trim((string) $typeName) !== '-' && trim((string) $typeValue) !== '' && trim((string) $typeValue) !== '-') {
                        $variant['options'][] = [
                            'type' => trim((string) $typeName),
                            'value' => trim((string) $typeValue),
                        ];
                    }
                }
            }

            $variants[] = $variant;
        }

        return $variants;
    }

    protected function findVariantField(array $data, array $fieldNames): mixed
    {
        foreach ($fieldNames as $name) {
            $value = $this->findFieldCaseInsensitive($data, $name);
            if ($value !== null) {
                return $value;
            }
        }
        return null;
    }

    protected function findFieldCaseInsensitive(array $data, string $fieldName): mixed
    {
        // Direkt eşleştirme
        if (array_key_exists($fieldName, $data)) {
            return $data[$fieldName];
        }

        // Case-insensitive eşleştirme
        $lowerField = strtolower($fieldName);
        foreach ($data as $key => $value) {
            if (strtolower($key) === $lowerField) {
                return $value;
            }
        }

        return null;
    }
}
