<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_credentials', function (Blueprint $table) {
            $table->id();
            $table->enum('marketplace', ['trendyol', 'hepsiburada']);
            $table->string('api_key')->nullable();
            $table->string('api_secret')->nullable();
            $table->string('seller_id')->nullable();
            $table->string('supplier_id')->nullable();
            $table->string('base_url')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamps();

            $table->unique('marketplace');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_credentials');
    }
};
