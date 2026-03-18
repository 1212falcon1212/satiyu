<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bulk_operation_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('xml_source_id')->constrained('xml_sources')->cascadeOnDelete();
            $table->string('operation'); // barcode_suffix, sku_suffix, name_modify
            $table->json('params');      // { suffix: "SHOP" } or { mode: "prefix", value: "[YENİ]" }
            $table->json('original_values'); // { product_id: { field: old_value } }
            $table->integer('affected_count')->default(0);
            $table->boolean('reverted')->default(false);
            $table->timestamp('reverted_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bulk_operation_logs');
    }
};
