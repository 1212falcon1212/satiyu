<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('xml_category_mappings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('xml_source_id')->constrained('xml_sources')->cascadeOnDelete();
            $table->string('xml_category_path', 500);
            $table->foreignId('local_category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->boolean('create_if_missing')->default(false);
            $table->timestamps();

            $table->unique(['xml_source_id', 'xml_category_path'], 'xml_cat_map_source_path_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('xml_category_mappings');
    }
};
