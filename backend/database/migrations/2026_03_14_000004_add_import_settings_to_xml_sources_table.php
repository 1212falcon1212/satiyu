<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('xml_sources', function (Blueprint $table) {
            $table->string('barcode_prefix', 20)->nullable()->after('is_active');
            $table->boolean('barcode_regenerate')->default(false)->after('barcode_prefix');
        });
    }

    public function down(): void
    {
        Schema::table('xml_sources', function (Blueprint $table) {
            $table->dropColumn(['barcode_prefix', 'barcode_regenerate']);
        });
    }
};
