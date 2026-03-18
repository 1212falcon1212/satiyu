<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_brand_mappings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('local_brand_id')->constrained('brands')->cascadeOnDelete();
            $table->enum('marketplace', ['trendyol', 'hepsiburada']);
            $table->string('marketplace_brand_id');
            $table->string('marketplace_brand_name')->nullable();
            $table->timestamps();

            $table->unique(['local_brand_id', 'marketplace'], 'mbm_brand_mp_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_brand_mappings');
    }
};
