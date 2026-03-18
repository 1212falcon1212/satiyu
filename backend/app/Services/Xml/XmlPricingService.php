<?php

namespace App\Services\Xml;

use App\Models\XmlPriceRule;
use App\Models\XmlSource;

class XmlPricingService
{
    /**
     * Apply price rules for a given XML source to a product's prices.
     *
     * @param XmlSource $source
     * @param float $price — original price from XML
     * @param float|null $comparePrice — original compare price from XML
     * @param string|null $categoryPath — the XML category path (for category-scoped rules)
     * @param string|null $brandName — the XML brand name (for brand-scoped rules)
     * @return array{price: float, compare_price: float|null}
     */
    public function applyRules(
        XmlSource $source,
        float $price,
        ?float $comparePrice = null,
        ?string $categoryPath = null,
        ?string $brandName = null,
    ): array {
        $rules = $source->priceRules()
            ->where('is_active', true)
            ->orderByDesc('priority')
            ->get();

        $adjustedPrice = $price;
        $adjustedComparePrice = $comparePrice;

        foreach ($rules as $rule) {
            if (!$this->ruleApplies($rule, $categoryPath, $brandName)) {
                continue;
            }

            $adjustedPrice = $this->adjustPrice($adjustedPrice, $rule);

            // If there's a compare price, adjust it too with the same rule
            if ($adjustedComparePrice !== null && $adjustedComparePrice > 0) {
                $adjustedComparePrice = $this->adjustPrice($adjustedComparePrice, $rule);
            }
        }

        // Apply rounding (use the last applicable rule's rounding)
        $lastRoundingRule = $rules->last(fn ($r) => $this->ruleApplies($r, $categoryPath, $brandName) && $r->rounding_type !== 'none');
        if ($lastRoundingRule) {
            $adjustedPrice = $this->applyRounding($adjustedPrice, $lastRoundingRule->rounding_type);
            if ($adjustedComparePrice !== null && $adjustedComparePrice > 0) {
                $adjustedComparePrice = $this->applyRounding($adjustedComparePrice, $lastRoundingRule->rounding_type);
            }
        }

        // Ensure price is positive
        $adjustedPrice = max(0.01, $adjustedPrice);

        // Ensure compare_price > price if set
        if ($adjustedComparePrice !== null && $adjustedComparePrice <= $adjustedPrice) {
            $adjustedComparePrice = null;
        }

        return [
            'price' => round($adjustedPrice, 2),
            'compare_price' => $adjustedComparePrice !== null ? round($adjustedComparePrice, 2) : null,
        ];
    }

    /**
     * Preview price adjustment (returns both original and adjusted for comparison).
     */
    public function previewPrices(
        XmlSource $source,
        array $products,
    ): array {
        $result = [];

        foreach ($products as $product) {
            $originalPrice = (float) ($product['price'] ?? 0);
            $originalCompare = (float) ($product['compare_price'] ?? 0);
            $categoryPath = $product['_category_path'] ?? null;
            $brandName = $product['brand'] ?? null;

            $adjusted = $this->applyRules(
                $source,
                $originalPrice,
                $originalCompare > 0 ? $originalCompare : null,
                $categoryPath,
                $brandName,
            );

            $result[] = [
                'name' => $product['name'] ?? '',
                'original_price' => $originalPrice,
                'adjusted_price' => $adjusted['price'],
                'original_compare_price' => $originalCompare,
                'adjusted_compare_price' => $adjusted['compare_price'],
                'category' => $categoryPath,
                'brand' => $brandName,
            ];
        }

        return $result;
    }

    protected function ruleApplies(XmlPriceRule $rule, ?string $categoryPath, ?string $brandName): bool
    {
        if ($rule->apply_to === 'all') {
            return true;
        }

        $values = array_filter(explode('|||', $rule->apply_to_value ?? ''));

        if ($rule->apply_to === 'category' && $categoryPath !== null) {
            foreach ($values as $val) {
                if (str_contains($categoryPath, $val)) {
                    return true;
                }
            }
            // Backward compat: single value without |||
            if (empty($values) && str_contains($categoryPath, $rule->apply_to_value ?? '')) {
                return true;
            }
            return false;
        }

        if ($rule->apply_to === 'brand' && $brandName !== null) {
            $brandLower = mb_strtolower($brandName);
            foreach ($values as $val) {
                if ($brandLower === mb_strtolower($val)) {
                    return true;
                }
            }
            return false;
        }

        return false;
    }

    protected function adjustPrice(float $price, XmlPriceRule $rule): float
    {
        return match ($rule->type) {
            'percentage' => $price * (1 + $rule->value / 100),
            'fixed' => $price + $rule->value,
            default => $price,
        };
    }

    protected function applyRounding(float $price, string $type): float
    {
        return match ($type) {
            'round_99' => floor($price) + 0.99,
            'round_90' => floor($price) + 0.90,
            'round_up' => ceil($price),
            'round_down' => floor($price),
            default => $price,
        };
    }
}
