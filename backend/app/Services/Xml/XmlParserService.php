<?php

namespace App\Services\Xml;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class XmlParserService
{
    /**
     * Fetch XML from URL and cache to disk. Returns cached path.
     * Cache TTL: 10 minutes — prevents 429 rate limits from repeated requests.
     */
    public function fetchAndCache(string $url, int $sourceId, int $timeout = 300): string
    {
        $cachePath = "xml-cache/{$sourceId}.xml";
        $metaPath = "xml-cache/{$sourceId}.meta";

        // Check if cached version exists and is fresh (10 min)
        if (Storage::exists($cachePath) && Storage::exists($metaPath)) {
            $meta = json_decode(Storage::get($metaPath), true);
            if (
                ($meta['url'] ?? '') === $url &&
                ($meta['cached_at'] ?? 0) > time() - 600
            ) {
                return Storage::get($cachePath);
            }
        }

        $content = $this->fetchFromUrl($url, $timeout);

        Storage::put($cachePath, $content);
        Storage::put($metaPath, json_encode([
            'url' => $url,
            'cached_at' => time(),
            'size' => strlen($content),
        ]));

        return $content;
    }

    public function fetchFromUrl(string $url, int $timeout = 300): string
    {
        $response = Http::timeout($timeout)
            ->withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept' => 'application/xml, text/xml, */*',
            ])
            ->get($url);

        if (!$response->successful()) {
            throw new \RuntimeException("XML çekilemedi: HTTP {$response->status()}");
        }

        $body = $response->body();

        if (stripos($body, '<!DOCTYPE') === 0 || stripos($body, '<html') === 0) {
            throw new \RuntimeException("XML yerine HTML döndü. URL kontrol edin: {$url}");
        }

        return $body;
    }

    public function parseXml(string $content): \SimpleXMLElement
    {
        $content = $this->normalizeEncoding($content);

        libxml_use_internal_errors(true);
        $xml = simplexml_load_string($content);

        if ($xml === false) {
            $errors = libxml_get_errors();
            libxml_clear_errors();
            $messages = array_map(fn($e) => trim($e->message), $errors);
            throw new \RuntimeException('XML parse hatası: ' . implode(', ', $messages));
        }

        return $xml;
    }

    /**
     * XMLReader-based streaming field detection.
     * Reads only the first N product nodes without loading entire XML into memory.
     */
    public function detectFieldsStreaming(string $content, int $sampleSize = 20, ?string $productNode = null, ?string $wrapperNode = null): array
    {
        $content = $this->normalizeEncoding($content);

        $reader = new \XMLReader();
        $reader->XML($content, 'UTF-8', LIBXML_NOERROR | LIBXML_NOWARNING);

        $productNodes = $productNode
            ? [$productNode]
            : ['product', 'urun', 'item', 'kayit', 'Product', 'Urun', 'Item', 'Kayit', 'row', 'Row', 'record', 'stok', 'Stok', 'data', 'Data'];

        $fields = [];
        $count = 0;

        while ($reader->read()) {
            if ($reader->nodeType !== \XMLReader::ELEMENT) {
                continue;
            }

            if (!in_array($reader->localName, $productNodes, true)) {
                continue;
            }

            // Found a product node — extract its child element names
            $depth = $reader->depth;
            $nodeXml = $reader->readOuterXml();

            if ($nodeXml) {
                $node = @simplexml_load_string($nodeXml);
                if ($node) {
                    foreach ($node->children() as $child) {
                        $name = $child->getName();
                        $fields[$name] = ($fields[$name] ?? 0) + 1;
                    }
                    // Also collect attributes
                    foreach ($node->attributes() as $key => $val) {
                        $attrName = '@' . $key;
                        $fields[$attrName] = ($fields[$attrName] ?? 0) + 1;
                    }
                }
            }

            $count++;
            if ($count >= $sampleSize) {
                break;
            }

            // Skip to next sibling (don't descend into this node's children again)
            $reader->next();
        }

        $reader->close();

        arsort($fields);

        return $fields;
    }

    public function extractProducts(\SimpleXMLElement $xml, ?string $productNode = null, ?string $wrapperNode = null, ?int $limit = null): array
    {
        $products = [];

        // Custom node belirtilmişse öncelikli kullan
        if ($productNode) {
            if ($wrapperNode && isset($xml->$wrapperNode->$productNode)) {
                foreach ($xml->$wrapperNode->$productNode as $node) {
                    $products[] = $this->xmlNodeToArray($node);
                    if ($limit && count($products) >= $limit) return $products;
                }
                return $products;
            }
            if (isset($xml->$productNode)) {
                foreach ($xml->$productNode as $node) {
                    $products[] = $this->xmlNodeToArray($node);
                    if ($limit && count($products) >= $limit) return $products;
                }
                return $products;
            }
        }

        // Otomatik node tespiti
        $productNodes = ['product', 'urun', 'item', 'kayit', 'Product', 'Urun', 'Item', 'Kayit', 'row', 'Row', 'record', 'stok', 'Stok', 'data', 'Data'];
        $wrapperNodes = ['products', 'urunler', 'items', 'Products', 'Urunler', 'Items', 'records', 'stoklar', 'Stoklar'];

        foreach ($productNodes as $nodeName) {
            // Level 1: root > productNode
            if (isset($xml->$nodeName)) {
                foreach ($xml->$nodeName as $node) {
                    $products[] = $this->xmlNodeToArray($node);
                    if ($limit && count($products) >= $limit) return $products;
                }
                return $products;
            }

            // Level 2: root > wrapper > productNode
            foreach ($wrapperNodes as $wrapper) {
                if (isset($xml->$wrapper->$nodeName)) {
                    foreach ($xml->$wrapper->$nodeName as $node) {
                        $products[] = $this->xmlNodeToArray($node);
                        if ($limit && count($products) >= $limit) return $products;
                    }
                    return $products;
                }
            }

            // Level 3: root > wrapper1 > wrapper2 > productNode (nested wrapper detection)
            foreach ($wrapperNodes as $wrapper1) {
                if (!isset($xml->$wrapper1)) {
                    continue;
                }
                foreach ($xml->$wrapper1->children() as $child) {
                    if (isset($child->$nodeName)) {
                        foreach ($child->$nodeName as $node) {
                            $products[] = $this->xmlNodeToArray($node);
                            if ($limit && count($products) >= $limit) return $products;
                        }
                        if (!empty($products)) {
                            return $products;
                        }
                    }
                }
            }
        }

        // Hiçbir node bulunamadıysa root children'ları dene
        if (empty($products) && count($xml->children()) > 0) {
            foreach ($xml->children() as $node) {
                if (count($node->children()) > 0) {
                    $products[] = $this->xmlNodeToArray($node);
                    if ($limit && count($products) >= $limit) return $products;
                }
            }
        }

        return $products;
    }

    public function detectFields(array $products): array
    {
        $fields = [];

        foreach ($products as $product) {
            foreach (array_keys($product) as $field) {
                if (!isset($fields[$field])) {
                    $fields[$field] = 0;
                }
                $fields[$field]++;
            }
        }

        arsort($fields);

        return $fields;
    }

    public function parsePrice(mixed $value): float
    {
        if (empty($value) && $value !== '0' && $value !== 0) {
            return 0.0;
        }

        if (is_numeric($value)) {
            return (float) $value;
        }

        $value = trim((string) $value);
        if (empty($value)) {
            return 0.0;
        }

        // Para birimi sembollerini temizle
        $value = str_replace([' ', 'TL', 'TRY', 'USD', 'EUR', '$', '€', '£'], '', $value);

        // Türkçe format: 1.234,56
        if (preg_match('/^(\d{1,3}(?:\.\d{3})*(?:,\d+)?)$/', $value)) {
            $value = str_replace('.', '', $value);
            $value = str_replace(',', '.', $value);
        }
        // İngilizce format: 1,234.56
        elseif (preg_match('/^(\d{1,3}(?:,\d{3})*(?:\.\d+)?)$/', $value)) {
            $value = str_replace(',', '', $value);
        } else {
            $value = str_replace(',', '.', $value);
        }

        $value = preg_replace('/[^0-9.]/', '', $value);

        $parts = explode('.', $value);
        if (count($parts) > 2) {
            $value = implode('', array_slice($parts, 0, -1)) . '.' . end($parts);
        }

        return max(0.0, (float) $value);
    }

    public function extractImages(array $data): array
    {
        $images = [];
        $imageKeys = ['image', 'resim', 'picture', 'img', 'photo', 'foto', 'gorsel', 'Image', 'Resim', 'Picture'];

        foreach ($data as $key => $value) {
            if (is_string($value) && filter_var($value, FILTER_VALIDATE_URL)) {
                // Exact match: image, resim, picture, img, photo, foto, gorsel
                if (in_array($key, $imageKeys)) {
                    $images[] = $value;
                }
                // Numbered: image_1, image-1, image1, resim_1, img_2, photo_3, picture1Path, etc.
                elseif (preg_match('/^(image|resim|picture|img|photo|foto|gorsel|mainImage|productImage)[_\-]?(\d+)?(Path|Url)?$/i', $key)) {
                    $images[] = $value;
                }
                // Variant style: vPicture1Path, picture1Path
                elseif (preg_match('/^(v?Picture|v?Image|v?Resim)\d+(Path|Url)?$/i', $key)) {
                    $images[] = $value;
                }
                // URL ending with image extension in any field
                elseif (preg_match('/\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i', $value) && stripos($key, 'image') !== false) {
                    $images[] = $value;
                }
            } elseif (is_array($value)) {
                foreach ($value as $subValue) {
                    if (is_string($subValue) && filter_var($subValue, FILTER_VALIDATE_URL)) {
                        $images[] = $subValue;
                    }
                }
            }
        }

        return array_values(array_unique($images));
    }

    public function fetchFromFile(string $path): string
    {
        $fullPath = storage_path('app/' . $path);
        if (!file_exists($fullPath)) {
            throw new \RuntimeException("XML dosyası bulunamadı: {$path}");
        }
        return file_get_contents($fullPath);
    }

    /**
     * Invalidate the cached XML for a source.
     */
    public function clearCache(int $sourceId): void
    {
        Storage::delete("xml-cache/{$sourceId}.xml");
        Storage::delete("xml-cache/{$sourceId}.meta");
    }

    protected function normalizeEncoding(string $content): string
    {
        // BOM temizliği
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);

        // Encoding normalizasyonu
        if (preg_match('/encoding=["\']([^"\']+)["\']/i', $content, $matches)) {
            $encoding = strtoupper($matches[1]);
            if ($encoding !== 'UTF-8') {
                $content = mb_convert_encoding($content, 'UTF-8', $encoding);
                $content = preg_replace('/encoding=["\'][^"\']+["\']/i', 'encoding="UTF-8"', $content);
            }
        }

        return $content;
    }

    protected function xmlNodeToArray(\SimpleXMLElement $node): array
    {
        $result = [];

        foreach ($node->attributes() as $key => $val) {
            $result['@' . $key] = (string) $val;
        }

        // Count child nodes by name to detect duplicates
        $childCounts = [];
        foreach ($node->children() as $child) {
            $name = $child->getName();
            $childCounts[$name] = ($childCounts[$name] ?? 0) + 1;
        }

        foreach ($node->children() as $child) {
            $name = $child->getName();
            $value = ($child->count() > 0) ? $this->xmlNodeToArray($child) : (string) $child;

            if ($childCounts[$name] > 1) {
                $result[$name][] = $value;
            } else {
                $result[$name] = $value;
            }
        }

        return $result;
    }
}
