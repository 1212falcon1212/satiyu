<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_category_mappings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('local_category_id')->constrained('categories')->cascadeOnDelete();
            $table->unsignedBigInteger('marketplace_category_id');
            $table->enum('marketplace', ['trendyol', 'hepsiburada']);
            $table->timestamps();

            $table->foreign('marketplace_category_id', 'mcm_mp_cat_id_fk')->references('id')->on('marketplace_categories')->cascadeOnDelete();
            $table->unique(['local_category_id', 'marketplace'], 'mcm_cat_mp_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_category_mappings');
    }
};
