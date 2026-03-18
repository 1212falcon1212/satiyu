<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProcessPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $hasCtoken = !empty($this->input('ctoken'));

        $rules = [
            'store_card' => 'nullable|boolean',
            'ctoken' => 'nullable|string',
            'cvv' => $hasCtoken ? 'nullable|string|min:3|max:4' : 'required|string|min:3|max:4',
            'installment_count' => 'required|integer|min:0|max:12',
            'card_type' => 'nullable|string|max:20',
        ];

        // Card details are only required for new card payments
        if (!$hasCtoken) {
            $rules['cc_owner'] = 'required|string|max:100';
            $rules['card_number'] = 'required|string|min:15|max:19';
            $rules['expiry_month'] = 'required|string|size:2';
            $rules['expiry_year'] = 'required|string|size:2';
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'cc_owner.required' => 'Kart sahibi adı zorunludur.',
            'card_number.required' => 'Kart numarası zorunludur.',
            'expiry_month.required' => 'Son kullanma ayı zorunludur.',
            'expiry_year.required' => 'Son kullanma yılı zorunludur.',
            'cvv.required' => 'CVV zorunludur.',
        ];
    }
}
