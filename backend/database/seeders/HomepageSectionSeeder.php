<?php

namespace Database\Seeders;

use App\Models\HomepageSection;
use Illuminate\Database\Seeder;

class HomepageSectionSeeder extends Seeder
{
    public function run(): void
    {
        HomepageSection::truncate();

        $sections = [
            [
                'type' => 'hero_banner',
                'title' => null,
                'subtitle' => null,
                'config' => ['position' => 'hero'],
                'sort_order' => 0,
                'is_active' => true,
            ],
            [
                'type' => 'featured_categories',
                'title' => 'Kategoriler',
                'subtitle' => null,
                'config' => [],
                'sort_order' => 1,
                'is_active' => true,
            ],
            [
                'type' => 'advantage_bar',
                'title' => null,
                'subtitle' => null,
                'config' => [],
                'sort_order' => 2,
                'is_active' => true,
            ],
            [
                'type' => 'banner_group',
                'title' => null,
                'subtitle' => null,
                'config' => ['position' => 'mid', 'layout' => 'triple'],
                'sort_order' => 3,
                'is_active' => true,
            ],
            [
                'type' => 'product_grid',
                'title' => 'Öne Çıkan Ürünler',
                'subtitle' => 'Yeni Sezon',
                'config' => [
                    'source' => 'featured',
                    'limit' => 10,
                    'columns' => 5,
                    'href' => '/one-cikanlar',
                    'mode' => 'grid',
                ],
                'sort_order' => 4,
                'is_active' => true,
            ],
            [
                'type' => 'brand_carousel',
                'title' => 'Markalar',
                'subtitle' => null,
                'config' => [],
                'sort_order' => 5,
                'is_active' => true,
            ],
            [
                'type' => 'trust_badges',
                'title' => null,
                'subtitle' => null,
                'config' => [],
                'sort_order' => 6,
                'is_active' => true,
            ],
            [
                'type' => 'newsletter',
                'title' => null,
                'subtitle' => null,
                'config' => [],
                'sort_order' => 7,
                'is_active' => true,
            ],
        ];

        foreach ($sections as $section) {
            HomepageSection::create($section);
        }
    }
}
