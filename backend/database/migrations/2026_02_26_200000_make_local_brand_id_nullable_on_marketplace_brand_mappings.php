<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('marketplace_brand_mappings', function (Blueprint $table) {
            $table->foreignId('local_brand_id')->nullable()->change();
            $table->unique(['marketplace', 'marketplace_brand_id'], 'mbm_mp_brand_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('marketplace_brand_mappings', function (Blueprint $table) {
            $table->dropUnique('mbm_mp_brand_id_unique');
            $table->foreignId('local_brand_id')->nullable(false)->change();
        });
    }
};
