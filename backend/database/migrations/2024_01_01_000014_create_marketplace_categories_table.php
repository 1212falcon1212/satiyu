<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_categories', function (Blueprint $table) {
            $table->id();
            $table->enum('marketplace', ['trendyol', 'hepsiburada']);
            $table->string('marketplace_category_id');
            $table->string('category_name');
            $table->string('parent_id')->nullable();
            $table->json('attributes')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->index(['marketplace', 'marketplace_category_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_categories');
    }
};
