<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            $table->renameColumn('text_color', 'title_color');
        });
        Schema::table('banners', function (Blueprint $table) {
            $table->string('subtitle_color', 7)->default('#FFFFFF')->after('title_color');
            $table->string('button_color', 7)->default('#FFFFFF')->after('subtitle_color');
        });
    }

    public function down(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            $table->dropColumn(['subtitle_color', 'button_color']);
        });
        Schema::table('banners', function (Blueprint $table) {
            $table->renameColumn('title_color', 'text_color');
        });
    }
};
