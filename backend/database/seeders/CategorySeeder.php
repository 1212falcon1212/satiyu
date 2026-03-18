<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $mainCategories = [
                [
                    'name' => 'Kadın Giyim',
                    'slug' => 'kadin-giyim',
                    'parent_id' => null,
                    'description' => 'Kadın modası için en yeni trendler. Elbiseler, bluzlar, pantolonlar ve daha fazlası.',
                    'icon' => 'shirt',
                    'image_url' => null,
                    'banner_image_url' => null,
                    'is_active' => true,
                    'sort_order' => 1,
                    'depth' => 0,
                    'path' => null,
                    'meta_title' => 'Kadın Giyim - Online Moda Alışveriş',
                    'meta_description' => 'Kadın giyim ürünlerinde en yeni trendler ve uygun fiyatlar.',
                    'product_count' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Erkek Giyim',
                    'slug' => 'erkek-giyim',
                    'parent_id' => null,
                    'description' => 'Erkek modası için şık ve kaliteli ürünler. Gömlekler, pantolonlar, ceketler.',
                    'icon' => 'user',
                    'image_url' => null,
                    'banner_image_url' => null,
                    'is_active' => true,
                    'sort_order' => 2,
                    'depth' => 0,
                    'path' => null,
                    'meta_title' => 'Erkek Giyim - Online Moda Alışveriş',
                    'meta_description' => 'Erkek giyim ürünlerinde kaliteli ve şık modeller.',
                    'product_count' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Çocuk Giyim',
                    'slug' => 'cocuk-giyim',
                    'parent_id' => null,
                    'description' => 'Çocuklar için rahat ve renkli giyim ürünleri.',
                    'icon' => 'baby',
                    'image_url' => null,
                    'banner_image_url' => null,
                    'is_active' => true,
                    'sort_order' => 3,
                    'depth' => 0,
                    'path' => null,
                    'meta_title' => 'Çocuk Giyim - Online Moda Alışveriş',
                    'meta_description' => 'Çocuk giyim ürünlerinde en güzel modeller.',
                    'product_count' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Ayakkabı',
                    'slug' => 'ayakkabi',
                    'parent_id' => null,
                    'description' => 'Kadın, erkek ve çocuk ayakkabıları. Spor, klasik ve günlük modeller.',
                    'icon' => 'footprints',
                    'image_url' => null,
                    'banner_image_url' => null,
                    'is_active' => true,
                    'sort_order' => 4,
                    'depth' => 0,
                    'path' => null,
                    'meta_title' => 'Ayakkabı Modelleri - Online Alışveriş',
                    'meta_description' => 'Kadın, erkek ve çocuk ayakkabı modelleri. Spor, klasik ve günlük.',
                    'product_count' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Çanta & Aksesuar',
                    'slug' => 'canta-aksesuar',
                    'parent_id' => null,
                    'description' => 'Çantalar, kemerler, şapkalar ve moda aksesuarları.',
                    'icon' => 'briefcase',
                    'image_url' => null,
                    'banner_image_url' => null,
                    'is_active' => true,
                    'sort_order' => 5,
                    'depth' => 0,
                    'path' => null,
                    'meta_title' => 'Çanta ve Aksesuar - Online Alışveriş',
                    'meta_description' => 'Şık çantalar, kemerler ve moda aksesuarları.',
                    'product_count' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Spor Giyim',
                    'slug' => 'spor-giyim',
                    'parent_id' => null,
                    'description' => 'Spor ve aktivite için rahat ve şık giyim ürünleri.',
                    'icon' => 'dumbbell',
                    'image_url' => null,
                    'banner_image_url' => null,
                    'is_active' => true,
                    'sort_order' => 6,
                    'depth' => 0,
                    'path' => null,
                    'meta_title' => 'Spor Giyim - Online Alışveriş',
                    'meta_description' => 'Spor giyim ürünlerinde en iyi markalar.',
                    'product_count' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ];

            DB::table('categories')->insert($mainCategories);

            $categoryIds = DB::table('categories')->whereNull('parent_id')->pluck('id', 'slug');

            $subCategories = [
                // Kadın Giyim
                ['name' => 'Elbiseler', 'slug' => 'elbiseler', 'parent_id' => $categoryIds['kadin-giyim'], 'description' => 'Günlük, gece ve özel gün elbiseleri.', 'icon' => 'shirt', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 1, 'depth' => 1, 'path' => $categoryIds['kadin-giyim'] . '/', 'meta_title' => 'Kadın Elbiseleri', 'meta_description' => 'Kadın elbise modelleri.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'Bluz & Gömlek', 'slug' => 'bluz-gomlek', 'parent_id' => $categoryIds['kadin-giyim'], 'description' => 'Şık bluz ve gömlek modelleri.', 'icon' => 'shirt', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 2, 'depth' => 1, 'path' => $categoryIds['kadin-giyim'] . '/', 'meta_title' => 'Kadın Bluz & Gömlek', 'meta_description' => 'Kadın bluz ve gömlek modelleri.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'Pantolon & Jean', 'slug' => 'kadin-pantolon', 'parent_id' => $categoryIds['kadin-giyim'], 'description' => 'Kadın pantolon ve jean modelleri.', 'icon' => 'shirt', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 3, 'depth' => 1, 'path' => $categoryIds['kadin-giyim'] . '/', 'meta_title' => 'Kadın Pantolon & Jean', 'meta_description' => 'Kadın pantolon ve jean modelleri.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'Etek', 'slug' => 'etek', 'parent_id' => $categoryIds['kadin-giyim'], 'description' => 'Mini, midi ve maxi etek modelleri.', 'icon' => 'shirt', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 4, 'depth' => 1, 'path' => $categoryIds['kadin-giyim'] . '/', 'meta_title' => 'Kadın Etek Modelleri', 'meta_description' => 'Kadın etek modelleri.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'Dış Giyim', 'slug' => 'kadin-dis-giyim', 'parent_id' => $categoryIds['kadin-giyim'], 'description' => 'Kadın mont, kaban ve trençkot modelleri.', 'icon' => 'shirt', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 5, 'depth' => 1, 'path' => $categoryIds['kadin-giyim'] . '/', 'meta_title' => 'Kadın Dış Giyim', 'meta_description' => 'Kadın dış giyim modelleri.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],

                // Erkek Giyim
                ['name' => 'Gömlek', 'slug' => 'erkek-gomlek', 'parent_id' => $categoryIds['erkek-giyim'], 'description' => 'Erkek gömlek modelleri.', 'icon' => 'user', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 1, 'depth' => 1, 'path' => $categoryIds['erkek-giyim'] . '/', 'meta_title' => 'Erkek Gömlek Modelleri', 'meta_description' => 'Erkek gömlek modelleri.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'T-Shirt & Polo', 'slug' => 'tshirt-polo', 'parent_id' => $categoryIds['erkek-giyim'], 'description' => 'Erkek t-shirt ve polo yaka modelleri.', 'icon' => 'user', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 2, 'depth' => 1, 'path' => $categoryIds['erkek-giyim'] . '/', 'meta_title' => 'Erkek T-Shirt & Polo', 'meta_description' => 'Erkek t-shirt ve polo yaka.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'Pantolon & Jean', 'slug' => 'erkek-pantolon', 'parent_id' => $categoryIds['erkek-giyim'], 'description' => 'Erkek pantolon ve jean modelleri.', 'icon' => 'user', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 3, 'depth' => 1, 'path' => $categoryIds['erkek-giyim'] . '/', 'meta_title' => 'Erkek Pantolon & Jean', 'meta_description' => 'Erkek pantolon ve jean modelleri.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'Takım Elbise', 'slug' => 'takim-elbise', 'parent_id' => $categoryIds['erkek-giyim'], 'description' => 'Erkek takım elbise modelleri.', 'icon' => 'user', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 4, 'depth' => 1, 'path' => $categoryIds['erkek-giyim'] . '/', 'meta_title' => 'Erkek Takım Elbise', 'meta_description' => 'Erkek takım elbise modelleri.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'Dış Giyim', 'slug' => 'erkek-dis-giyim', 'parent_id' => $categoryIds['erkek-giyim'], 'description' => 'Erkek mont, kaban ve ceket modelleri.', 'icon' => 'user', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 5, 'depth' => 1, 'path' => $categoryIds['erkek-giyim'] . '/', 'meta_title' => 'Erkek Dış Giyim', 'meta_description' => 'Erkek dış giyim modelleri.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],

                // Çocuk Giyim
                ['name' => 'Kız Çocuk', 'slug' => 'kiz-cocuk', 'parent_id' => $categoryIds['cocuk-giyim'], 'description' => 'Kız çocuk giyim ürünleri.', 'icon' => 'baby', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 1, 'depth' => 1, 'path' => $categoryIds['cocuk-giyim'] . '/', 'meta_title' => 'Kız Çocuk Giyim', 'meta_description' => 'Kız çocuk giyim modelleri.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'Erkek Çocuk', 'slug' => 'erkek-cocuk', 'parent_id' => $categoryIds['cocuk-giyim'], 'description' => 'Erkek çocuk giyim ürünleri.', 'icon' => 'baby', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 2, 'depth' => 1, 'path' => $categoryIds['cocuk-giyim'] . '/', 'meta_title' => 'Erkek Çocuk Giyim', 'meta_description' => 'Erkek çocuk giyim modelleri.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'Bebek', 'slug' => 'bebek', 'parent_id' => $categoryIds['cocuk-giyim'], 'description' => 'Bebek giyim ürünleri.', 'icon' => 'baby', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 3, 'depth' => 1, 'path' => $categoryIds['cocuk-giyim'] . '/', 'meta_title' => 'Bebek Giyim', 'meta_description' => 'Bebek giyim modelleri.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],

                // Ayakkabı
                ['name' => 'Kadın Ayakkabı', 'slug' => 'kadin-ayakkabi', 'parent_id' => $categoryIds['ayakkabi'], 'description' => 'Kadın ayakkabı modelleri.', 'icon' => 'footprints', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 1, 'depth' => 1, 'path' => $categoryIds['ayakkabi'] . '/', 'meta_title' => 'Kadın Ayakkabı', 'meta_description' => 'Kadın ayakkabı modelleri.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'Erkek Ayakkabı', 'slug' => 'erkek-ayakkabi', 'parent_id' => $categoryIds['ayakkabi'], 'description' => 'Erkek ayakkabı modelleri.', 'icon' => 'footprints', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 2, 'depth' => 1, 'path' => $categoryIds['ayakkabi'] . '/', 'meta_title' => 'Erkek Ayakkabı', 'meta_description' => 'Erkek ayakkabı modelleri.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'Spor Ayakkabı', 'slug' => 'spor-ayakkabi', 'parent_id' => $categoryIds['ayakkabi'], 'description' => 'Spor ayakkabı modelleri.', 'icon' => 'footprints', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 3, 'depth' => 1, 'path' => $categoryIds['ayakkabi'] . '/', 'meta_title' => 'Spor Ayakkabı', 'meta_description' => 'Spor ayakkabı modelleri.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],

                // Çanta & Aksesuar
                ['name' => 'Kadın Çanta', 'slug' => 'kadin-canta', 'parent_id' => $categoryIds['canta-aksesuar'], 'description' => 'Kadın çanta modelleri.', 'icon' => 'briefcase', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 1, 'depth' => 1, 'path' => $categoryIds['canta-aksesuar'] . '/', 'meta_title' => 'Kadın Çanta', 'meta_description' => 'Kadın çanta modelleri.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'Kemer & Şapka', 'slug' => 'kemer-sapka', 'parent_id' => $categoryIds['canta-aksesuar'], 'description' => 'Kemer ve şapka modelleri.', 'icon' => 'briefcase', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 2, 'depth' => 1, 'path' => $categoryIds['canta-aksesuar'] . '/', 'meta_title' => 'Kemer & Şapka', 'meta_description' => 'Kemer ve şapka modelleri.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],

                // Spor Giyim
                ['name' => 'Eşofman Takımı', 'slug' => 'esofman-takimi', 'parent_id' => $categoryIds['spor-giyim'], 'description' => 'Eşofman takımı modelleri.', 'icon' => 'dumbbell', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 1, 'depth' => 1, 'path' => $categoryIds['spor-giyim'] . '/', 'meta_title' => 'Eşofman Takımı', 'meta_description' => 'Eşofman takımı modelleri.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'Spor Tişört', 'slug' => 'spor-tisort', 'parent_id' => $categoryIds['spor-giyim'], 'description' => 'Spor tişört modelleri.', 'icon' => 'dumbbell', 'image_url' => null, 'banner_image_url' => null, 'is_active' => true, 'sort_order' => 2, 'depth' => 1, 'path' => $categoryIds['spor-giyim'] . '/', 'meta_title' => 'Spor Tişört', 'meta_description' => 'Spor tişört modelleri.', 'product_count' => 0, 'created_at' => now(), 'updated_at' => now()],
            ];

            DB::table('categories')->insert($subCategories);
        });
    }
}
