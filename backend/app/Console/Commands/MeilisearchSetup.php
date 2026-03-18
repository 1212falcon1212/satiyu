<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Meilisearch\Client;

class MeilisearchSetup extends Command
{
    protected $signature = 'meilisearch:setup';
    protected $description = 'Configure Meilisearch index settings (filterable, sortable, typo tolerance)';

    public function handle(): void
    {
        $client = new Client(
            config('scout.meilisearch.host'),
            config('scout.meilisearch.key'),
        );

        $index = $client->index('products');

        // Searchable attributes — priority order
        $index->updateSearchableAttributes([
            'name',
            'brand_name',
            'category_name',
            'sku',
            'barcode',
            'description',
        ]);

        $this->info('✓ Searchable attributes set');

        // Filterable attributes — for faceted search
        $index->updateFilterableAttributes([
            'is_active',
            'is_featured',
            'is_bestseller',
            'is_new',
            'brand_id',
            'category_id',
            'stock_status',
            'price',
        ]);

        $this->info('✓ Filterable attributes set');

        // Sortable attributes
        $index->updateSortableAttributes([
            'price',
            'created_at',
            'stock_quantity',
            'name',
        ]);

        $this->info('✓ Sortable attributes set');

        // Typo tolerance — good for Turkish
        $index->updateTypoTolerance([
            'enabled' => true,
            'minWordSizeForTypos' => [
                'oneTypo' => 4,
                'twoTypos' => 8,
            ],
        ]);

        $this->info('✓ Typo tolerance configured');

        // Pagination — max 1000 results
        $index->updatePagination(['maxTotalHits' => 1000]);

        $this->info('✓ Pagination configured');

        $this->info('Meilisearch setup complete!');
    }
}
