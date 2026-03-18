<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class VariantSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $variantTypes = [
                [
                    'name' => 'Renk',
                    'display_type' => 'color_swatch',
                    'sort_order' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Beden',
                    'display_type' => 'button',
                    'sort_order' => 2,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ];

            DB::table('variant_types')->insert($variantTypes);

            $typeIds = DB::table('variant_types')->pluck('id', 'name');

            $colorOptions = [
                ['variant_type_id' => $typeIds['Renk'], 'value' => 'Siyah', 'color_code' => '#1F2937', 'image_url' => null, 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
                ['variant_type_id' => $typeIds['Renk'], 'value' => 'Beyaz', 'color_code' => '#F9FAFB', 'image_url' => null, 'sort_order' => 2, 'created_at' => now(), 'updated_at' => now()],
                ['variant_type_id' => $typeIds['Renk'], 'value' => 'Lacivert', 'color_code' => '#1E3A5F', 'image_url' => null, 'sort_order' => 3, 'created_at' => now(), 'updated_at' => now()],
                ['variant_type_id' => $typeIds['Renk'], 'value' => 'Kırmızı', 'color_code' => '#EF4444', 'image_url' => null, 'sort_order' => 4, 'created_at' => now(), 'updated_at' => now()],
                ['variant_type_id' => $typeIds['Renk'], 'value' => 'Bej', 'color_code' => '#D4B896', 'image_url' => null, 'sort_order' => 5, 'created_at' => now(), 'updated_at' => now()],
                ['variant_type_id' => $typeIds['Renk'], 'value' => 'Haki', 'color_code' => '#6B7F5E', 'image_url' => null, 'sort_order' => 6, 'created_at' => now(), 'updated_at' => now()],
                ['variant_type_id' => $typeIds['Renk'], 'value' => 'Pembe', 'color_code' => '#F9A8D4', 'image_url' => null, 'sort_order' => 7, 'created_at' => now(), 'updated_at' => now()],
            ];

            $sizeOptions = [
                ['variant_type_id' => $typeIds['Beden'], 'value' => 'XS', 'color_code' => null, 'image_url' => null, 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
                ['variant_type_id' => $typeIds['Beden'], 'value' => 'S', 'color_code' => null, 'image_url' => null, 'sort_order' => 2, 'created_at' => now(), 'updated_at' => now()],
                ['variant_type_id' => $typeIds['Beden'], 'value' => 'M', 'color_code' => null, 'image_url' => null, 'sort_order' => 3, 'created_at' => now(), 'updated_at' => now()],
                ['variant_type_id' => $typeIds['Beden'], 'value' => 'L', 'color_code' => null, 'image_url' => null, 'sort_order' => 4, 'created_at' => now(), 'updated_at' => now()],
                ['variant_type_id' => $typeIds['Beden'], 'value' => 'XL', 'color_code' => null, 'image_url' => null, 'sort_order' => 5, 'created_at' => now(), 'updated_at' => now()],
                ['variant_type_id' => $typeIds['Beden'], 'value' => 'XXL', 'color_code' => null, 'image_url' => null, 'sort_order' => 6, 'created_at' => now(), 'updated_at' => now()],
            ];

            DB::table('variant_options')->insert(array_merge($colorOptions, $sizeOptions));
        });
    }
}
