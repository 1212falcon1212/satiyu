<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('xml_brand_mappings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('xml_source_id')->constrained('xml_sources')->cascadeOnDelete();
            $table->string('xml_brand_name', 255);
            $table->string('local_brand_name', 255)->nullable();
            $table->foreignId('local_brand_id')->nullable()->constrained('brands')->nullOnDelete();
            $table->timestamps();

            $table->unique(['xml_source_id', 'xml_brand_name'], 'xml_brand_map_source_name_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('xml_brand_mappings');
    }
};
