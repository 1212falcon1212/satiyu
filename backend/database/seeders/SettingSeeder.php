<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $settings = [
                ['group' => 'general', 'key' => 'site_name', 'value' => 'Moda Butik', 'type' => 'text', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'general', 'key' => 'site_url', 'value' => 'https://www.modabutik.com.tr', 'type' => 'text', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'general', 'key' => 'site_email', 'value' => 'info@modabutik.com.tr', 'type' => 'text', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'general', 'key' => 'site_phone', 'value' => '+90 212 555 0199', 'type' => 'text', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'general', 'key' => 'whatsapp', 'value' => '+905321234567', 'type' => 'text', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'general', 'key' => 'address', 'value' => 'Nişantaşı, Abdi İpekçi Caddesi No: 42, 34367 Şişli/İstanbul', 'type' => 'textarea', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'general', 'key' => 'site_description', 'value' => 'Kadın, erkek ve çocuk giyimde en yeni trendler ve uygun fiyatlar.', 'type' => 'textarea', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'general', 'key' => 'working_hours', 'value' => 'Pazartesi - Cumartesi: 09:00 - 20:00', 'type' => 'text', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'general', 'key' => 'site_logo', 'value' => '', 'type' => 'text', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'general', 'key' => 'site_favicon', 'value' => '', 'type' => 'text', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'general', 'key' => 'footer_background_image', 'value' => '', 'type' => 'text', 'created_at' => now(), 'updated_at' => now()],

                ['group' => 'shipping', 'key' => 'free_shipping_limit', 'value' => '300', 'type' => 'number', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'shipping', 'key' => 'default_shipping_cost', 'value' => '29.90', 'type' => 'number', 'created_at' => now(), 'updated_at' => now()],

                ['group' => 'seo', 'key' => 'meta_title', 'value' => 'Moda Butik - Online Moda Alışveriş', 'type' => 'text', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'seo', 'key' => 'meta_description', 'value' => 'Kadın, erkek ve çocuk giyimde en yeni trendler. Kaliteli ve uygun fiyatlı moda ürünleri.', 'type' => 'textarea', 'created_at' => now(), 'updated_at' => now()],

                ['group' => 'social', 'key' => 'instagram_url', 'value' => 'https://www.instagram.com/modabutik', 'type' => 'text', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'social', 'key' => 'facebook_url', 'value' => 'https://www.facebook.com/modabutik', 'type' => 'text', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'social', 'key' => 'twitter_url', 'value' => '', 'type' => 'text', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'social', 'key' => 'youtube_url', 'value' => '', 'type' => 'text', 'created_at' => now(), 'updated_at' => now()],

                ['group' => 'homepage', 'key' => 'featured_category_ids', 'value' => '', 'type' => 'text', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'homepage', 'key' => 'special_products_title', 'value' => 'Sizin İçin Özel Ürünler', 'type' => 'text', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'homepage', 'key' => 'special_products_subtitle', 'value' => 'Moda tutkunları için seçilmiş ürünler', 'type' => 'text', 'created_at' => now(), 'updated_at' => now()],

                ['group' => 'payment', 'key' => 'credit_card_enabled', 'value' => 'true', 'type' => 'boolean', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'payment', 'key' => 'bank_transfer_enabled', 'value' => 'true', 'type' => 'boolean', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'payment', 'key' => 'cash_on_delivery_enabled', 'value' => 'false', 'type' => 'boolean', 'created_at' => now(), 'updated_at' => now()],
                ['group' => 'payment', 'key' => 'havale_discount_rate', 'value' => '5', 'type' => 'number', 'created_at' => now(), 'updated_at' => now()],
            ];

            DB::table('settings')->insertOrIgnore($settings);
        });
    }
}
