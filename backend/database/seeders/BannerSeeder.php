<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BannerSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $banners = [
                // Hero banners (homepage slider)
                [
                    'title' => 'Yeni Sezon Koleksiyonu',
                    'image_url' => 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&h=800&fit=crop&q=80',
                    'mobile_image_url' => null,
                    'link_url' => '/kategori/kadin-giyim',
                    'position' => 'hero',
                    'sort_order' => 1,
                    'is_active' => true,
                    'starts_at' => null,
                    'ends_at' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'title' => 'Erkek Modası',
                    'image_url' => 'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=1920&h=800&fit=crop&q=80',
                    'mobile_image_url' => null,
                    'link_url' => '/kategori/erkek-giyim',
                    'position' => 'hero',
                    'sort_order' => 2,
                    'is_active' => true,
                    'starts_at' => null,
                    'ends_at' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'title' => 'Sezon Sonu İndirimleri',
                    'image_url' => 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920&h=800&fit=crop&q=80',
                    'mobile_image_url' => null,
                    'link_url' => '/tum-urunler',
                    'position' => 'hero',
                    'sort_order' => 3,
                    'is_active' => true,
                    'starts_at' => null,
                    'ends_at' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],

                // Mid banners (triple banner section)
                [
                    'title' => 'Kadın Koleksiyonu',
                    'image_url' => 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800&h=600&fit=crop&q=80',
                    'mobile_image_url' => null,
                    'link_url' => '/kategori/kadin-giyim',
                    'position' => 'mid',
                    'sort_order' => 1,
                    'is_active' => true,
                    'starts_at' => null,
                    'ends_at' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'title' => 'Erkek Koleksiyonu',
                    'image_url' => 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&h=600&fit=crop&q=80',
                    'mobile_image_url' => null,
                    'link_url' => '/kategori/erkek-giyim',
                    'position' => 'mid',
                    'sort_order' => 2,
                    'is_active' => true,
                    'starts_at' => null,
                    'ends_at' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'title' => 'Ayakkabı & Aksesuar',
                    'image_url' => 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=600&fit=crop&q=80',
                    'mobile_image_url' => null,
                    'link_url' => '/kategori/ayakkabi',
                    'position' => 'mid',
                    'sort_order' => 3,
                    'is_active' => true,
                    'starts_at' => null,
                    'ends_at' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ];

            DB::table('banners')->insert($banners);
        });
    }
}
