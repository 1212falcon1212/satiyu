<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            $table->string('subtitle')->nullable()->after('title');
            $table->string('button_text')->nullable()->after('link_url');
            $table->string('text_color', 7)->default('#FFFFFF')->after('button_text');
        });
    }

    public function down(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            $table->dropColumn(['subtitle', 'button_text', 'text_color']);
        });
    }
};
