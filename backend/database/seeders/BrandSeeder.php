<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BrandSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $brands = [
                [
                    'name' => 'Zara',
                    'slug' => 'zara',
                    'logo_url' => null,
                    'is_active' => true,
                    'is_featured' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'H&M',
                    'slug' => 'hm',
                    'logo_url' => null,
                    'is_active' => true,
                    'is_featured' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Mango',
                    'slug' => 'mango',
                    'logo_url' => null,
                    'is_active' => true,
                    'is_featured' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Tommy Hilfiger',
                    'slug' => 'tommy-hilfiger',
                    'logo_url' => null,
                    'is_active' => true,
                    'is_featured' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Calvin Klein',
                    'slug' => 'calvin-klein',
                    'logo_url' => null,
                    'is_active' => true,
                    'is_featured' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Polo Ralph Lauren',
                    'slug' => 'polo-ralph-lauren',
                    'logo_url' => null,
                    'is_active' => true,
                    'is_featured' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Lacoste',
                    'slug' => 'lacoste',
                    'logo_url' => null,
                    'is_active' => true,
                    'is_featured' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Koton',
                    'slug' => 'koton',
                    'logo_url' => null,
                    'is_active' => true,
                    'is_featured' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'LC Waikiki',
                    'slug' => 'lc-waikiki',
                    'logo_url' => null,
                    'is_active' => true,
                    'is_featured' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Defacto',
                    'slug' => 'defacto',
                    'logo_url' => null,
                    'is_active' => true,
                    'is_featured' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ];

            DB::table('brands')->insert($brands);
        });
    }
}
