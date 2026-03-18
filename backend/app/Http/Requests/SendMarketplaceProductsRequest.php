<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SendMarketplaceProductsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_ids' => ['required', 'array', 'min:1'],
            'product_ids.*' => ['exists:products,id'],
            'min_stock' => ['sometimes', 'integer', 'min:0'],
            'price_overrides' => ['sometimes', 'array'],
        ];
    }
}
