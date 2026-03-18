<?php

namespace App\Console\Commands;

use App\Models\MarketplaceCredential;
use App\Models\MarketplaceProduct;
use App\Services\Marketplace\TrendyolApiService;
use Illuminate\Console\Command;

class TrendyolDeleteProductsCommand extends Command
{
    protected $signature = 'trendyol:delete-products
        {--status=all : Silinecek ürünlerin statusu (approved, rejected, pending, all)}
        {--batch-size=50 : Her API isteğinde gönderilecek barkod sayısı}
        {--dry-run : Silmeden sadece kaç ürün silineceğini göster}';

    protected $description = 'Trendyol\'daki ürünleri toplu siler ve marketplace_products kayıtlarını temizler';

    public function handle(): int
    {
        $status = $this->option('status');
        $batchSize = (int) $this->option('batch-size');
        $dryRun = $this->option('dry-run');

        $query = MarketplaceProduct::where('marketplace', 'trendyol')
            ->whereNotNull('batch_request_id');

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $mpProducts = $query->with('product:id,barcode,name')->get();

        if ($mpProducts->isEmpty()) {
            $this->info('Silinecek ürün bulunamadı.');

            return self::SUCCESS;
        }

        // Collect all barcodes (product + variant barcodes)
        $barcodes = [];
        $productIds = [];

        foreach ($mpProducts as $mp) {
            $product = $mp->product;
            if (! $product) {
                continue;
            }

            $productIds[] = $mp->product_id;

            // Main product barcode
            if ($product->barcode) {
                $barcodes[] = $product->barcode;
            }

            // Variant barcodes from listing_data
            $listingData = $mp->listing_data;
            if (is_array($listingData) && isset($listingData['variants'])) {
                foreach ($listingData['variants'] as $variant) {
                    if (! empty($variant['barcode'])) {
                        $barcodes[] = $variant['barcode'];
                    }
                }
            }

            // Also get variant barcodes from DB
            $variantBarcodes = $product->variants()
                ->where('is_active', true)
                ->whereNotNull('barcode')
                ->where('barcode', '!=', '')
                ->pluck('barcode')
                ->toArray();

            $barcodes = array_merge($barcodes, $variantBarcodes);
        }

        $barcodes = array_unique(array_filter($barcodes));

        $this->info("Status: {$status}");
        $this->info("Ürün sayısı: {$mpProducts->count()}");
        $this->info("Barkod sayısı: " . count($barcodes));
        $this->info("Batch size: {$batchSize}");

        if ($dryRun) {
            $this->warn('DRY RUN — gerçek silme yapılmadı.');
            $this->table(
                ['Product ID', 'Status', 'Barcode', 'Name'],
                $mpProducts->map(fn ($mp) => [
                    $mp->product_id,
                    $mp->status,
                    $mp->product->barcode ?? '—',
                    mb_substr($mp->product->name ?? '—', 0, 50),
                ])->take(20)->toArray()
            );
            if ($mpProducts->count() > 20) {
                $this->info('... ve ' . ($mpProducts->count() - 20) . ' ürün daha');
            }

            return self::SUCCESS;
        }

        if (! $this->confirm("Trendyol'dan {$mpProducts->count()} ürün (" . count($barcodes) . " barkod) silinecek. Emin misiniz?")) {
            $this->info('İptal edildi.');

            return self::SUCCESS;
        }

        $credential = MarketplaceCredential::where('marketplace', 'trendyol')->firstOrFail();
        $service = new TrendyolApiService($credential);

        $chunks = array_chunk($barcodes, $batchSize);
        $totalDeleted = 0;
        $batchRequestIds = [];

        $this->output->progressStart(count($chunks));

        foreach ($chunks as $chunk) {
            try {
                $result = $service->deleteProducts($chunk);
                $batchRequestId = $result['batchRequestId'] ?? null;
                if ($batchRequestId) {
                    $batchRequestIds[] = $batchRequestId;
                }
                $totalDeleted += count($chunk);
            } catch (\Exception $e) {
                $this->error("Batch hatası: {$e->getMessage()}");
            }

            $this->output->progressAdvance();
        }

        $this->output->progressFinish();

        // Clean up marketplace_products records
        $deletedRecords = MarketplaceProduct::where('marketplace', 'trendyol')
            ->whereIn('product_id', $productIds)
            ->delete();

        $this->newLine();
        $this->info("Trendyol API: {$totalDeleted} barkod silme isteği gönderildi (" . count($batchRequestIds) . " batch)");
        $this->info("DB: {$deletedRecords} marketplace_products kaydi silindi");

        if (! empty($batchRequestIds)) {
            $this->newLine();
            $this->info('Batch Request ID\'ler:');
            foreach ($batchRequestIds as $id) {
                $this->line("  {$id}");
            }
            $this->newLine();
            $this->info('Sonuçları kontrol etmek için: php artisan trendyol:delete-products --check-batch=<id>');
        }

        return self::SUCCESS;
    }
}
