<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_cargo_companies', function (Blueprint $table) {
            $table->id();
            $table->enum('marketplace', ['trendyol', 'hepsiburada']);
            $table->string('cargo_company_id');
            $table->string('cargo_company_name');
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->unique(['marketplace', 'cargo_company_id'], 'mcc_mp_cargo_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_cargo_companies');
    }
};
