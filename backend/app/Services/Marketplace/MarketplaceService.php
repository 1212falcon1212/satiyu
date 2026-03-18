<?php

namespace App\Services\Marketplace;

use App\Models\MarketplaceCredential;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

abstract class MarketplaceService
{
    protected string $baseUrl;
    protected int $timeout = 60;
    protected int $rateLimitRequests = 50;
    protected int $rateLimitSeconds = 10;

    public function __construct(
        protected MarketplaceCredential $credential,
    ) {
        $this->baseUrl = $credential->base_url ?? $this->getDefaultBaseUrl();
    }

    abstract protected function getDefaultBaseUrl(): string;

    abstract public function syncCategories(): int;

    abstract public function syncBrands(): int;

    abstract public function getCategoryAttributes(int $categoryId): array;

    abstract public function createProducts(array $products): array;

    abstract public function updateProducts(array $products): array;

    abstract public function updatePriceAndStock(array $items): array;

    abstract public function getProducts(array $filters = []): array;

    abstract public function testConnection(): bool;

    protected function getAuthHeaders(): array
    {
        $authString = base64_encode($this->credential->api_key . ':' . $this->credential->api_secret);
        $supplierId = $this->credential->supplier_id ?? '';

        return [
            'Authorization' => 'Basic ' . $authString,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'User-Agent' => $this->credential->user_agent ?: ($supplierId . ' - SelfIntegration'),
        ];
    }

    protected function makeRequest(string $method, string $endpoint, array $options = []): Response
    {
        $this->checkRateLimit($endpoint);

        $url = $this->baseUrl . $endpoint;
        $attempt = 0;
        $maxRetries = 3;
        $lastException = null;

        while ($attempt < $maxRetries) {
            try {
                $attempt++;

                Log::info("{$this->getMarketplaceName()} API Request: {$method} {$endpoint}", [
                    'attempt' => $attempt,
                ]);

                $http = Http::withHeaders($this->getAuthHeaders())->timeout($this->timeout);

                if (strtolower($method) === 'get') {
                    $response = $http->get($url, $options['query'] ?? []);
                } else {
                    $requestUrl = $url;
                    if (!empty($options['query'])) {
                        $requestUrl .= '?' . http_build_query($options['query']);
                    }
                    $response = $http->$method($requestUrl, $options['body'] ?? $options['json'] ?? []);
                }

                if ($response->successful()) {
                    return $response;
                }

                $statusCode = $response->status();
                $retryableErrors = [429, 500, 502, 503, 504];

                if (in_array($statusCode, $retryableErrors) && $attempt < $maxRetries) {
                    $waitTime = pow(2, $attempt);
                    Log::warning("{$this->getMarketplaceName()} API Error (retryable): {$statusCode}, {$waitTime}s bekle", [
                        'endpoint' => $endpoint,
                        'attempt' => $attempt,
                    ]);
                    sleep($waitTime);
                    continue;
                }

                Log::error("{$this->getMarketplaceName()} API Error: {$statusCode}", [
                    'endpoint' => $endpoint,
                    'body' => $response->body(),
                ]);

                return $response;

            } catch (\Exception $e) {
                $lastException = $e;

                if ($attempt < $maxRetries) {
                    $waitTime = pow(2, $attempt);
                    Log::warning("{$this->getMarketplaceName()} API Network Error, {$waitTime}s bekle", [
                        'endpoint' => $endpoint,
                        'error' => $e->getMessage(),
                        'attempt' => $attempt,
                    ]);
                    sleep($waitTime);
                    continue;
                }

                Log::error("{$this->getMarketplaceName()} API Network Error (max retries)", [
                    'endpoint' => $endpoint,
                    'error' => $e->getMessage(),
                ]);
                throw $e;
            }
        }

        if ($lastException) {
            throw $lastException;
        }

        throw new \RuntimeException('API isteği başarısız oldu.');
    }

    protected function checkRateLimit(string $endpoint): void
    {
        $cacheKey = strtolower($this->getMarketplaceName()) . '_rate_limit_' . md5($endpoint);
        $now = microtime(true);

        try {
            if (config('cache.default') === 'redis') {
                $redis = Redis::connection();
                $key = 'rate_limit:' . $cacheKey;
                $windowStart = $now - $this->rateLimitSeconds;

                $redis->zremrangebyscore($key, 0, $windowStart);
                $currentCount = $redis->zcard($key);

                if ($currentCount >= $this->rateLimitRequests) {
                    $oldestRequest = $redis->zrange($key, 0, 0, true);
                    if (!empty($oldestRequest)) {
                        $oldestTime = reset($oldestRequest);
                        $waitTime = $this->rateLimitSeconds - ($now - $oldestTime);
                        if ($waitTime > 0) {
                            Log::warning("{$this->getMarketplaceName()} rate limit, {$waitTime}s bekleniyor");
                            usleep((int) ($waitTime * 1000000));
                            $redis->zremrangebyscore($key, 0, $now - $this->rateLimitSeconds);
                        }
                    }
                }

                $redis->zadd($key, $now, (string) $now);
                $redis->expire($key, $this->rateLimitSeconds);

                return;
            }
        } catch (\Exception $e) {
            Log::debug("Redis kullanilamiyor, Cache fallback", ['error' => $e->getMessage()]);
        }

        // Fallback: Cache
        $requests = Cache::get($cacheKey, []);
        $requests = array_filter($requests, fn($time) => ($now - $time) < $this->rateLimitSeconds);

        if (count($requests) >= $this->rateLimitRequests) {
            $waitTime = $this->rateLimitSeconds - ($now - min($requests));
            Log::warning("{$this->getMarketplaceName()} rate limit (Cache), {$waitTime}s bekleniyor");
            usleep((int) ($waitTime * 1000000));
            $requests = [];
        }

        $requests[] = $now;
        Cache::put($cacheKey, $requests, $this->rateLimitSeconds);
    }

    protected function getMarketplaceName(): string
    {
        return class_basename(static::class);
    }

    protected function getSellerId(): string
    {
        // Trendyol API URL'lerinde /sellers/{supplierId} kullanilir
        // supplier_id = satici ID (Trendyol panelindeki Entegrasyon Bilgileri)
        $supplierId = $this->credential->supplier_id;

        if (!$supplierId) {
            throw new \RuntimeException('Supplier ID (Satici ID) tanimlanmamis.');
        }

        return $supplierId;
    }
}
