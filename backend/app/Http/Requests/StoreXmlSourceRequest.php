<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreXmlSourceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'url' => ['required_without:file', 'nullable', 'url', 'max:2048'],
            'file' => ['required_without:url', 'nullable', 'file', 'max:51200'],
            'type' => ['required', 'in:supplier,custom'],
            'mapping_config' => ['nullable', 'array'],
            'auto_sync' => ['boolean'],
            'sync_interval' => ['nullable', 'in:hourly,daily,weekly,monthly'],
            'is_active' => ['boolean'],
        ];
    }
}
