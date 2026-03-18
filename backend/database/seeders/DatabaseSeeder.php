<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
            BrandSeeder::class,
            CategorySeeder::class,
            VariantSeeder::class,
            ProductSeeder::class,
            BannerSeeder::class,
            CustomerSeeder::class,
            ReviewSeeder::class,
            SettingSeeder::class,
            PageSeeder::class,
            TrustBadgeSeeder::class,
            BlogPostSeeder::class,
        ]);
    }
}
