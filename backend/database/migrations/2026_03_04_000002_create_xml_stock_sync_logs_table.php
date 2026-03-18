<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('xml_stock_sync_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('xml_source_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('xml_product_count')->default(0);
            $table->unsignedInteger('matched_products')->default(0);
            $table->unsignedInteger('stock_changed_products')->default(0);
            $table->unsignedInteger('matched_variants')->default(0);
            $table->unsignedInteger('stock_changed_variants')->default(0);
            $table->unsignedInteger('unmatched_count')->default(0);
            $table->unsignedInteger('failed')->default(0);
            $table->json('error_log')->nullable();
            $table->json('changes_summary')->nullable();
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('xml_stock_sync_logs');
    }
};
