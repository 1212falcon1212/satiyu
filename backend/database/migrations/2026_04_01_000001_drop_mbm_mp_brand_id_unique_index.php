<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('marketplace_brand_mappings', function (Blueprint $table) {
            $table->dropUnique('mbm_mp_brand_id_unique');
            $table->index(['marketplace', 'marketplace_brand_id'], 'mbm_mp_brand_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('marketplace_brand_mappings', function (Blueprint $table) {
            $table->dropIndex('mbm_mp_brand_id_index');
            $table->unique(['marketplace', 'marketplace_brand_id'], 'mbm_mp_brand_id_unique');
        });
    }
};
