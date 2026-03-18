<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMarketplaceCredentialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $isUpdate = $this->isMethod('PUT') || $this->isMethod('PATCH');

        return [
            'api_key' => [$isUpdate ? 'nullable' : 'required', 'string'],
            'api_secret' => [$isUpdate ? 'nullable' : 'required', 'string'],
            'seller_id' => ['nullable', 'string', 'max:255'],
            'supplier_id' => ['nullable', 'string'],
            'base_url' => ['nullable', 'url'],
            'user_agent' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
        ];
    }
}
