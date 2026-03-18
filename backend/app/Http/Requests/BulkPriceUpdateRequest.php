<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BulkPriceUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_ids' => ['required', 'array', 'min:1'],
            'product_ids.*' => ['integer', 'exists:products,id'],
            'rules' => ['required', 'array', 'min:1'],
            'rules.*.min_price' => ['required', 'numeric', 'min:0'],
            'rules.*.max_price' => ['required', 'numeric', 'gte:rules.*.min_price'],
            'rules.*.adjustment_type' => ['required', 'in:percentage,fixed'],
            'rules.*.adjustment_value' => ['required', 'numeric'],
        ];
    }

    public function messages(): array
    {
        return [
            'rules.*.max_price.gte' => 'Maksimum fiyat, minimum fiyattan büyük veya eşit olmalıdır.',
        ];
    }
}
