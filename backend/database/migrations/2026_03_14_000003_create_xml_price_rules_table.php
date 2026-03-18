<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('xml_price_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('xml_source_id')->constrained('xml_sources')->cascadeOnDelete();
            $table->string('name', 255);
            $table->enum('type', ['percentage', 'fixed']);
            $table->decimal('value', 10, 2);
            $table->enum('apply_to', ['all', 'category', 'brand']);
            $table->string('apply_to_value')->nullable();
            $table->enum('rounding_type', ['none', 'round_99', 'round_90', 'round_up', 'round_down'])->default('none');
            $table->boolean('include_vat')->default(true);
            $table->boolean('is_active')->default(true);
            $table->integer('priority')->default(0);
            $table->timestamps();

            $table->index(['xml_source_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('xml_price_rules');
    }
};
