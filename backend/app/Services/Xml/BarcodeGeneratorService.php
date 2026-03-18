<?php

namespace App\Services\Xml;

use App\Models\Product;
use App\Models\ProductVariant;

class BarcodeGeneratorService
{
    /**
     * Generate an EAN-13 barcode with optional prefix.
     */
    public function generate(?string $prefix = null): string
    {
        $maxAttempts = 100;
        for ($i = 0; $i < $maxAttempts; $i++) {
            $barcode = $this->generateEan13($prefix);
            // Check uniqueness across products and variants
            $existsProduct = Product::where('barcode', $barcode)->exists();
            $existsVariant = ProductVariant::where('barcode', $barcode)->exists();
            if (!$existsProduct && !$existsVariant) {
                return $barcode;
            }
        }

        // Fallback: UUID-based
        return ($prefix ?? 'GEN') . '-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 10));
    }

    /**
     * Generate a valid EAN-13 barcode.
     */
    protected function generateEan13(?string $prefix = null): string
    {
        // Use prefix as first digits (max 3 digits), pad the rest randomly
        $prefixDigits = '';
        if ($prefix) {
            $prefixDigits = preg_replace('/[^0-9]/', '', $prefix);
            $prefixDigits = substr($prefixDigits, 0, 3);
        }

        $remainingLength = 12 - strlen($prefixDigits);
        $randomPart = '';
        for ($i = 0; $i < $remainingLength; $i++) {
            $randomPart .= mt_rand(0, 9);
        }

        $first12 = $prefixDigits . $randomPart;

        // Calculate check digit
        $checkDigit = $this->calculateEan13CheckDigit($first12);

        return $first12 . $checkDigit;
    }

    /**
     * Calculate EAN-13 check digit.
     */
    protected function calculateEan13CheckDigit(string $first12): int
    {
        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $digit = (int) $first12[$i];
            $sum += ($i % 2 === 0) ? $digit : $digit * 3;
        }
        $remainder = $sum % 10;
        return $remainder === 0 ? 0 : 10 - $remainder;
    }
}
