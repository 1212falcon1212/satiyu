<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_stock_sync_logs', function (Blueprint $table) {
            $table->id();
            $table->enum('marketplace', ['trendyol', 'hepsiburada']);
            $table->foreignId('credential_id')->constrained('marketplace_credentials')->cascadeOnDelete();
            $table->unsignedInteger('total_products')->default(0);
            $table->unsignedInteger('stock_changed')->default(0);
            $table->unsignedInteger('api_calls')->default(0);
            $table->unsignedInteger('failed')->default(0);
            $table->json('batch_request_ids')->nullable();
            $table->json('error_log')->nullable();
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['marketplace', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_stock_sync_logs');
    }
};
