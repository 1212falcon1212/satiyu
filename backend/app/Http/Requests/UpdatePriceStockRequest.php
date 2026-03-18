<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePriceStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'items.*.price' => ['nullable', 'numeric', 'min:0'],
            'items.*.stock' => ['nullable', 'integer', 'min:0'],
            'items.*.variant_overrides' => ['nullable', 'array'],
            'items.*.variant_overrides.*' => ['numeric', 'min:0'],
        ];
    }
}
