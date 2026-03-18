<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('variant_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('display_type', ['color_swatch', 'button', 'dropdown'])->default('button');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('variant_types');
    }
};
