<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('xml_sources', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('url');
            $table->enum('type', ['supplier', 'custom'])->default('supplier');
            $table->json('mapping_config')->nullable();
            $table->boolean('auto_sync')->default(false);
            $table->string('sync_interval')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('xml_sources');
    }
};
