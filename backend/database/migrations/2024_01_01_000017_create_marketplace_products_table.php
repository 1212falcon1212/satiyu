<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->enum('marketplace', ['trendyol', 'hepsiburada']);
            $table->string('marketplace_product_id')->nullable();
            $table->string('marketplace_barcode')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected', 'on_sale'])->default('pending');
            $table->decimal('price', 12, 2)->nullable();
            $table->decimal('sale_price', 12, 2)->nullable();
            $table->decimal('commission_rate', 5, 2)->nullable();
            $table->json('listing_data')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->unique(['product_id', 'marketplace']);
            $table->index(['marketplace', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_products');
    }
};
