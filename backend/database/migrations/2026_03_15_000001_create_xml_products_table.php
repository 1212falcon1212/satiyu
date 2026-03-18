<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('xml_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('xml_source_id')->constrained('xml_sources')->cascadeOnDelete();
            $table->string('provider')->default('');
            $table->string('external_sku')->index();
            $table->string('external_name')->default('');
            $table->json('raw_data')->nullable();
            $table->json('mapped_data')->nullable();
            $table->foreignId('local_product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->enum('sync_status', ['pending', 'imported', 'updated', 'unchanged', 'failed'])->default('pending');
            $table->decimal('price_in_xml', 12, 2)->default(0);
            $table->integer('stock_in_xml')->default(0);
            $table->timestamp('last_seen_at')->nullable();
            $table->json('changes_detected')->nullable();
            $table->timestamps();

            $table->unique(['xml_source_id', 'external_sku']);
            $table->index('sync_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('xml_products');
    }
};
