<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PayTRService
{
    private function getCredentials(): array
    {
        $settingService = app(SettingService::class);

        return [
            'merchant_id' => $settingService->get('paytr_merchant_id', ''),
            'merchant_key' => $settingService->get('paytr_merchant_key', ''),
            'merchant_salt' => $settingService->get('paytr_merchant_salt', ''),
            'test_mode' => $settingService->get('paytr_test_mode', 'false') === 'true' ? '1' : '0',
        ];
    }

    public function processDirectPayment(Order $order, array $cardData, string $userIp, bool $storeCard = false, ?string $utoken = null, ?string $ctoken = null): array
    {
        $creds = $this->getCredentials();
        $settingService = app(SettingService::class);

        $merchantOid = str_replace('-', '', $order->order_number);
        $email = $order->customer->email;
        // Direct API uses decimal format, e.g. "100.99"
        $paymentAmount = number_format($order->total, 2, '.', '');

        $userName = $order->shipping_address['full_name'] ?? '';
        $userAddress = $order->shipping_address['address_line'] ?? '';
        $userPhone = $order->shipping_address['phone'] ?? '';

        $basketItems = [];
        foreach ($order->items as $item) {
            $basketItems[] = [$item->product_name, (string) $item->unit_price, (int) $item->quantity];
        }
        $userBasket = htmlentities(json_encode($basketItems));

        $siteUrl = rtrim($settingService->get('site_url', config('app.frontend_url', '')), '/');
        $merchantOkUrl = $siteUrl . '/siparis/onay?order=' . $order->order_number . '&payment=credit_card';
        $merchantFailUrl = $siteUrl . '/siparis/onay?order=' . $order->order_number . '&payment=credit_card&status=failed';

        $installmentCount = (int) ($cardData['installment_count'] ?? 0);
        $currency = 'TL';
        $non3d = '0'; // Always 3D Secure
        $paymentType = 'card';

        // Hash: merchant_id + user_ip + merchant_oid + email + payment_amount + payment_type + installment_count + currency + test_mode + non_3d + merchant_salt
        $hashStr = $creds['merchant_id'] . $userIp . $merchantOid . $email
            . $paymentAmount . $paymentType . $installmentCount . $currency
            . $creds['test_mode'] . $non3d;
        $paytrToken = base64_encode(hash_hmac('sha256', $hashStr . $creds['merchant_salt'], $creds['merchant_key'], true));

        $postData = [
            'merchant_id' => $creds['merchant_id'],
            'user_ip' => $userIp,
            'merchant_oid' => $merchantOid,
            'email' => $email,
            'payment_type' => $paymentType,
            'payment_amount' => $paymentAmount,
            'currency' => $currency,
            'test_mode' => $creds['test_mode'],
            'non_3d' => $non3d,
            'merchant_ok_url' => $merchantOkUrl,
            'merchant_fail_url' => $merchantFailUrl,
            'user_name' => $userName,
            'user_address' => $userAddress,
            'user_phone' => $userPhone,
            'user_basket' => $userBasket,
            'debug_on' => $creds['test_mode'] === '1' ? 1 : 0,
            'paytr_token' => $paytrToken,
            'installment_count' => $installmentCount,
            'lang' => 'tr',
        ];

        // Saved card payment: use utoken + ctoken instead of card details
        if ($ctoken && $utoken) {
            $postData['utoken'] = $utoken;
            $postData['ctoken'] = $ctoken;
            // CVV is still needed if require_cvv=1
            if (!empty($cardData['cvv'])) {
                $postData['cvv'] = $cardData['cvv'];
            }
        } else {
            // New card payment
            $postData['cc_owner'] = $cardData['cc_owner'];
            $postData['card_number'] = str_replace(' ', '', $cardData['card_number']);
            $postData['expiry_month'] = $cardData['expiry_month'];
            $postData['expiry_year'] = $cardData['expiry_year'];
            $postData['cvv'] = $cardData['cvv'];

            // Store card for future use
            if ($storeCard) {
                $postData['store_card'] = 1;
                if ($utoken) {
                    $postData['utoken'] = $utoken;
                }
                Log::info('PayTR store_card enabled', ['order' => $merchantOid, 'has_utoken' => !empty($utoken)]);
            }
        }

        // card_type is needed for installment payments
        if ($installmentCount > 0 && !empty($cardData['card_type'])) {
            $postData['card_type'] = $cardData['card_type'];
        }

        try {
            $response = Http::asForm()
                ->timeout(30)
                ->post('https://www.paytr.com/odeme', $postData);

            $body = $response->body();

            // If response is JSON, it's an error
            $json = json_decode($body, true);
            if (json_last_error() === JSON_ERROR_NONE && isset($json['status'])) {
                if ($json['status'] === 'error' || $json['status'] === 'failed') {
                    Log::error('PayTR Direct API error', ['response' => $json, 'order' => $merchantOid]);
                    return [
                        'success' => false,
                        'message' => $json['err_msg'] ?? $json['reason'] ?? 'Ödeme işlemi başarısız.',
                    ];
                }
            }

            // If response is HTML, it's the 3D Secure page
            if (str_contains($body, '<html') || str_contains($body, '<form') || str_contains($body, '<HTML') || str_contains($body, '<!DOCTYPE')) {
                return [
                    'success' => true,
                    'type' => '3d_secure',
                    'html' => $body,
                ];
            }

            Log::error('PayTR Direct API unexpected response', [
                'body' => mb_substr($body, 0, 500),
                'order' => $merchantOid,
            ]);

            return [
                'success' => false,
                'message' => 'Beklenmeyen bir yanıt alındı.',
            ];
        } catch (\Exception $e) {
            Log::error('PayTR Direct API exception', [
                'message' => $e->getMessage(),
                'order' => $merchantOid,
            ]);

            return [
                'success' => false,
                'message' => 'Ödeme servisi ile bağlantı kurulamadı.',
            ];
        }
    }

    public function listCards(string $utoken): array
    {
        $creds = $this->getCredentials();

        $paytrToken = base64_encode(hash_hmac('sha256', $utoken . $creds['merchant_salt'], $creds['merchant_key'], true));

        try {
            $response = Http::asForm()
                ->timeout(10)
                ->post('https://www.paytr.com/odeme/capi/list', [
                    'merchant_id' => $creds['merchant_id'],
                    'utoken' => $utoken,
                    'paytr_token' => $paytrToken,
                ]);

            $result = $response->json();

            // PayTR returns a direct array of cards, or {"status":"error","err_msg":"..."} on failure
            if (is_array($result) && !isset($result['status'])) {
                return [
                    'success' => true,
                    'cards' => $result,
                ];
            }

            if (($result['status'] ?? '') === 'success') {
                return [
                    'success' => true,
                    'cards' => $result['cards'] ?? [],
                ];
            }

            return [
                'success' => false,
                'message' => $result['err_msg'] ?? 'Kartlar listelenemedi.',
                'cards' => [],
            ];
        } catch (\Exception $e) {
            Log::error('PayTR list cards error', ['message' => $e->getMessage()]);
            return ['success' => false, 'message' => 'Kart listeleme hatası.', 'cards' => []];
        }
    }

    public function deleteCard(string $utoken, string $ctoken): array
    {
        $creds = $this->getCredentials();

        $paytrToken = base64_encode(hash_hmac('sha256', $ctoken . $utoken . $creds['merchant_salt'], $creds['merchant_key'], true));

        try {
            $response = Http::asForm()
                ->timeout(10)
                ->post('https://www.paytr.com/odeme/capi/delete', [
                    'merchant_id' => $creds['merchant_id'],
                    'utoken' => $utoken,
                    'ctoken' => $ctoken,
                    'paytr_token' => $paytrToken,
                ]);

            $result = $response->json();

            if (($result['status'] ?? '') === 'success') {
                return ['success' => true];
            }

            return [
                'success' => false,
                'message' => $result['err_msg'] ?? 'Kart silinemedi.',
            ];
        } catch (\Exception $e) {
            Log::error('PayTR delete card error', ['message' => $e->getMessage()]);
            return ['success' => false, 'message' => 'Kart silme hatası.'];
        }
    }

    public function binLookup(string $binNumber): array
    {
        $creds = $this->getCredentials();

        $hashStr = $binNumber . $creds['merchant_id'];
        $paytrToken = base64_encode(hash_hmac('sha256', $hashStr . $creds['merchant_salt'], $creds['merchant_key'], true));

        try {
            $response = Http::asForm()
                ->timeout(10)
                ->post('https://www.paytr.com/odeme/api/bin-detail', [
                    'merchant_id' => $creds['merchant_id'],
                    'bin_number' => $binNumber,
                    'paytr_token' => $paytrToken,
                ]);

            $result = $response->json();

            if (($result['status'] ?? '') === 'success') {
                return [
                    'success' => true,
                    'brand' => $result['brand'] ?? '',
                    'card_type' => $result['card_type'] ?? '',
                    'bank' => $result['bank'] ?? '',
                    'schema' => $result['schema'] ?? '',
                ];
            }

            return [
                'success' => false,
                'message' => $result['err_msg'] ?? 'BIN sorgulanamadı.',
            ];
        } catch (\Exception $e) {
            Log::error('PayTR BIN lookup error', ['message' => $e->getMessage()]);
            return ['success' => false, 'message' => 'BIN sorgu hatası.'];
        }
    }

    public function getInstallmentRates(): array
    {
        $creds = $this->getCredentials();

        $requestId = (string) time();
        $hashStr = $creds['merchant_id'] . $requestId;
        $paytrToken = base64_encode(hash_hmac('sha256', $hashStr . $creds['merchant_salt'], $creds['merchant_key'], true));

        try {
            $response = Http::asForm()
                ->timeout(10)
                ->post('https://www.paytr.com/odeme/taksit-oranlari', [
                    'merchant_id' => $creds['merchant_id'],
                    'request_id' => $requestId,
                    'paytr_token' => $paytrToken,
                ]);

            $result = $response->json();

            if (($result['status'] ?? '') === 'success') {
                return [
                    'success' => true,
                    'installment_rates' => $result['oranlar'] ?? $result['installment_rates'] ?? [],
                ];
            }

            return [
                'success' => false,
                'message' => $result['err_msg'] ?? 'Taksit oranları alınamadı.',
            ];
        } catch (\Exception $e) {
            Log::error('PayTR installment rates error', ['message' => $e->getMessage()]);
            return ['success' => false, 'message' => 'Taksit oranları alınamadı.'];
        }
    }

    public function processRefund(Order $order, string $amount, ?string $referenceNo = null): array
    {
        $creds = $this->getCredentials();

        $merchantOid = str_replace('-', '', $order->order_number);
        $returnAmount = number_format((float) $amount, 2, '.', '');

        $hashStr = $creds['merchant_id'] . $merchantOid . $returnAmount . $creds['merchant_salt'];
        $paytrToken = base64_encode(hash_hmac('sha256', $hashStr, $creds['merchant_key'], true));

        $postData = [
            'merchant_id' => $creds['merchant_id'],
            'merchant_oid' => $merchantOid,
            'return_amount' => $returnAmount,
            'paytr_token' => $paytrToken,
        ];

        if ($referenceNo) {
            $postData['reference_no'] = $referenceNo;
        }

        try {
            $response = Http::asForm()
                ->timeout(30)
                ->post('https://www.paytr.com/odeme/iade', $postData);

            $result = $response->json();

            if (($result['status'] ?? '') === 'success') {
                return [
                    'success' => true,
                    'message' => 'İade işlemi başarılı.',
                    'merchant_oid' => $result['merchant_oid'] ?? $merchantOid,
                    'return_amount' => $result['return_amount'] ?? $returnAmount,
                ];
            }

            Log::error('PayTR refund error', ['response' => $result, 'order' => $merchantOid]);

            return [
                'success' => false,
                'message' => $result['err_msg'] ?? 'İade işlemi başarısız.',
            ];
        } catch (\Exception $e) {
            Log::error('PayTR refund exception', [
                'message' => $e->getMessage(),
                'order' => $merchantOid,
            ]);

            return [
                'success' => false,
                'message' => 'İade servisi ile bağlantı kurulamadı.',
            ];
        }
    }

    public function verifyCallback(array $post): bool
    {
        $settingService = app(SettingService::class);

        $merchantKey = $settingService->get('paytr_merchant_key', '');
        $merchantSalt = $settingService->get('paytr_merchant_salt', '');

        $hash = base64_encode(hash_hmac('sha256',
            $post['merchant_oid'] . $merchantSalt . $post['status'] . $post['total_amount'],
            $merchantKey, true));

        return $hash === $post['hash'];
    }
}
