<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('marketplace_credentials', function (Blueprint $table) {
            $table->text('api_key')->nullable()->change();
            $table->text('api_secret')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('marketplace_credentials', function (Blueprint $table) {
            $table->string('api_key')->nullable()->change();
            $table->string('api_secret')->nullable()->change();
        });
    }
};
