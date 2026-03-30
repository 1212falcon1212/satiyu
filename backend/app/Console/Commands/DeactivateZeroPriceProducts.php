<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;

class DeactivateZeroPriceProducts extends Command
{
    protected $signature = 'xml:deactivate-zero-price
                            {--threshold=0.01 : Maximum price threshold to deactivate}
                            {--dry-run : Show count without making changes}';

    protected $description = 'Deactivate products with price <= 0.01 TL (zero XML price issue)';

    public function handle(): int
    {
        $threshold = (float) $this->option('threshold');
        $dryRun = (bool) $this->option('dry-run');

        $query = Product::where('price', '<=', $threshold)
            ->where('is_active', true);

        $count = $query->count();

        if ($count === 0) {
            $this->info('No active products found with price <= ' . $threshold . ' TL.');
            return self::SUCCESS;
        }

        if ($dryRun) {
            $this->warn("DRY RUN: {$count} active products found with price <= {$threshold} TL would be deactivated.");
            return self::SUCCESS;
        }

        $updated = $query->update(['is_active' => false]);

        $this->info("Deactivated {$updated} products with price <= {$threshold} TL.");

        return self::SUCCESS;
    }
}
