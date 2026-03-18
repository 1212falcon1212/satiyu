<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreVariantTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'display_type' => ['required', 'in:color_swatch,button,dropdown'],
            'sort_order' => ['integer', 'min:0'],
            'options' => ['nullable', 'array'],
            'options.*.value' => ['required_with:options', 'string', 'max:255'],
            'options.*.color_code' => ['nullable', 'string', 'max:7'],
            'options.*.image_url' => ['nullable', 'string', 'max:255'],
            'options.*.sort_order' => ['integer', 'min:0'],
        ];
    }
}
