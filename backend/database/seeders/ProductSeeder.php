<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $brandIds = DB::table('brands')->pluck('id', 'slug')->toArray();
            $categoryIds = DB::table('categories')->pluck('id', 'slug')->toArray();

            $products = [
                // --- Kadın Giyim - Elbiseler ---
                [
                    'sku' => 'KD-ELB-001', 'barcode' => '8690001100001',
                    'name' => 'Çiçek Desenli Midi Elbise',
                    'description' => '<p>Yazlık çiçek desenli midi boy elbise. Hafif ve akıcı kumaşıyla yaz aylarında rahatlıkla kullanabilirsiniz.</p><ul><li>Kumaş: %100 Viskon</li><li>Boy: Midi</li><li>Yaka: V yaka</li></ul>',
                    'short_description' => 'Çiçek desenli, V yaka midi elbise. %100 viskon.',
                    'price' => 449.90, 'compare_price' => 599.90, 'cost_price' => 180.00,
                    'currency' => 'TRY', 'stock_quantity' => 120, 'stock_status' => 'in_stock',
                    'weight' => 0.30, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['zara'], 'category_id' => $categoryIds['elbiseler'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => true, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 1,
                ],
                [
                    'sku' => 'KD-ELB-002', 'barcode' => '8690001100002',
                    'name' => 'Saten Gece Elbisesi',
                    'description' => '<p>Zarif saten kumaştan üretilmiş gece elbisesi. Özel davetler ve kutlamalar için ideal.</p>',
                    'short_description' => 'Saten kumaş, uzun boy gece elbisesi.',
                    'price' => 899.90, 'compare_price' => 1299.90, 'cost_price' => 350.00,
                    'currency' => 'TRY', 'stock_quantity' => 45, 'stock_status' => 'in_stock',
                    'weight' => 0.45, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['mango'], 'category_id' => $categoryIds['elbiseler'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 2,
                ],
                [
                    'sku' => 'KD-ELB-003', 'barcode' => '8690001100003',
                    'name' => 'Triko Kazak Elbise',
                    'description' => '<p>Kış ayları için sıcak tutan triko kazak elbise. Boğazlı yaka ve diz üstü boy.</p>',
                    'short_description' => 'Boğazlı yaka triko kazak elbise.',
                    'price' => 349.90, 'compare_price' => null, 'cost_price' => 140.00,
                    'currency' => 'TRY', 'stock_quantity' => 80, 'stock_status' => 'in_stock',
                    'weight' => 0.40, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['hm'], 'category_id' => $categoryIds['elbiseler'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => true, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 3,
                ],

                // --- Kadın Giyim - Bluz & Gömlek ---
                [
                    'sku' => 'KD-BLZ-001', 'barcode' => '8690001100004',
                    'name' => 'Saten Gömlek Bluz',
                    'description' => '<p>Şık saten kumaştan üretilmiş gömlek bluz. Ofis ve günlük kullanıma uygun.</p>',
                    'short_description' => 'Saten kumaş, düğmeli gömlek bluz.',
                    'price' => 279.90, 'compare_price' => 399.90, 'cost_price' => 110.00,
                    'currency' => 'TRY', 'stock_quantity' => 200, 'stock_status' => 'in_stock',
                    'weight' => 0.20, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['zara'], 'category_id' => $categoryIds['bluz-gomlek'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 1,
                ],
                [
                    'sku' => 'KD-BLZ-002', 'barcode' => '8690001100005',
                    'name' => 'Dantel Detaylı Crop Bluz',
                    'description' => '<p>Dantel detaylı crop bluz. Yüksek bel pantolon ve eteklerle kombinlenebilir.</p>',
                    'short_description' => 'Dantel detaylı, kısa boy crop bluz.',
                    'price' => 199.90, 'compare_price' => null, 'cost_price' => 80.00,
                    'currency' => 'TRY', 'stock_quantity' => 150, 'stock_status' => 'in_stock',
                    'weight' => 0.15, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['koton'], 'category_id' => $categoryIds['bluz-gomlek'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => true, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 2,
                ],

                // --- Kadın Giyim - Pantolon ---
                [
                    'sku' => 'KD-PNT-001', 'barcode' => '8690001100006',
                    'name' => 'Yüksek Bel Skinny Jean',
                    'description' => '<p>Yüksek bel, skinny fit jean pantolon. Esnek kumaşıyla gün boyu konfor.</p>',
                    'short_description' => 'Yüksek bel skinny jean, esnek kumaş.',
                    'price' => 329.90, 'compare_price' => 449.90, 'cost_price' => 130.00,
                    'currency' => 'TRY', 'stock_quantity' => 250, 'stock_status' => 'in_stock',
                    'weight' => 0.50, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['mango'], 'category_id' => $categoryIds['kadin-pantolon'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 1,
                ],
                [
                    'sku' => 'KD-PNT-002', 'barcode' => '8690001100007',
                    'name' => 'Wide Leg Palazzo Pantolon',
                    'description' => '<p>Bol paça palazzo pantolon. Şık ve rahat, yazlık kumaştan.</p>',
                    'short_description' => 'Bol paça palazzo pantolon.',
                    'price' => 399.90, 'compare_price' => null, 'cost_price' => 160.00,
                    'currency' => 'TRY', 'stock_quantity' => 90, 'stock_status' => 'in_stock',
                    'weight' => 0.35, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['hm'], 'category_id' => $categoryIds['kadin-pantolon'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => true, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 2,
                ],

                // --- Erkek Giyim - Gömlek ---
                [
                    'sku' => 'ER-GML-001', 'barcode' => '8690001200001',
                    'name' => 'Slim Fit Oxford Gömlek',
                    'description' => '<p>Klasik Oxford kumaştan üretilmiş slim fit gömlek. İş ve günlük kullanım için ideal.</p>',
                    'short_description' => 'Slim fit Oxford gömlek, %100 pamuk.',
                    'price' => 349.90, 'compare_price' => 499.90, 'cost_price' => 140.00,
                    'currency' => 'TRY', 'stock_quantity' => 180, 'stock_status' => 'in_stock',
                    'weight' => 0.25, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['tommy-hilfiger'], 'category_id' => $categoryIds['erkek-gomlek'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 1,
                ],
                [
                    'sku' => 'ER-GML-002', 'barcode' => '8690001200002',
                    'name' => 'Keten Gömlek',
                    'description' => '<p>%100 keten kumaştan üretilmiş yazlık gömlek. Serin ve doğal hissiyat.</p>',
                    'short_description' => 'Keten kumaş, regular fit yazlık gömlek.',
                    'price' => 299.90, 'compare_price' => null, 'cost_price' => 120.00,
                    'currency' => 'TRY', 'stock_quantity' => 100, 'stock_status' => 'in_stock',
                    'weight' => 0.20, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['zara'], 'category_id' => $categoryIds['erkek-gomlek'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => true, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 2,
                ],

                // --- Erkek Giyim - T-Shirt & Polo ---
                [
                    'sku' => 'ER-TSH-001', 'barcode' => '8690001200003',
                    'name' => 'Basic Polo Yaka T-Shirt',
                    'description' => '<p>Klasik polo yaka t-shirt. %100 pamuk pique kumaş.</p>',
                    'short_description' => 'Polo yaka, %100 pamuk pique t-shirt.',
                    'price' => 249.90, 'compare_price' => 349.90, 'cost_price' => 100.00,
                    'currency' => 'TRY', 'stock_quantity' => 300, 'stock_status' => 'in_stock',
                    'weight' => 0.25, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['lacoste'], 'category_id' => $categoryIds['tshirt-polo'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 1,
                ],
                [
                    'sku' => 'ER-TSH-002', 'barcode' => '8690001200004',
                    'name' => 'Oversize Baskılı T-Shirt',
                    'description' => '<p>Oversize fit baskılı t-shirt. Rahat kesim, günlük kullanım için ideal.</p>',
                    'short_description' => 'Oversize fit, baskılı pamuklu t-shirt.',
                    'price' => 149.90, 'compare_price' => null, 'cost_price' => 60.00,
                    'currency' => 'TRY', 'stock_quantity' => 400, 'stock_status' => 'in_stock',
                    'weight' => 0.20, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['defacto'], 'category_id' => $categoryIds['tshirt-polo'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => true, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 2,
                ],

                // --- Erkek Giyim - Pantolon ---
                [
                    'sku' => 'ER-PNT-001', 'barcode' => '8690001200005',
                    'name' => 'Slim Fit Chino Pantolon',
                    'description' => '<p>Slim fit kesim chino pantolon. Esnek kumaşıyla gün boyu konfor sağlar.</p>',
                    'short_description' => 'Slim fit chino pantolon, esnek kumaş.',
                    'price' => 379.90, 'compare_price' => 499.90, 'cost_price' => 150.00,
                    'currency' => 'TRY', 'stock_quantity' => 160, 'stock_status' => 'in_stock',
                    'weight' => 0.45, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['polo-ralph-lauren'], 'category_id' => $categoryIds['erkek-pantolon'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 1,
                ],
                [
                    'sku' => 'ER-PNT-002', 'barcode' => '8690001200006',
                    'name' => 'Straight Fit Denim Jean',
                    'description' => '<p>Düz kesim denim jean. Kaliteli indigo yıkamalı kumaş.</p>',
                    'short_description' => 'Straight fit denim jean, indigo yıkama.',
                    'price' => 449.90, 'compare_price' => null, 'cost_price' => 180.00,
                    'currency' => 'TRY', 'stock_quantity' => 200, 'stock_status' => 'in_stock',
                    'weight' => 0.55, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['calvin-klein'], 'category_id' => $categoryIds['erkek-pantolon'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => true, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 2,
                ],

                // --- Erkek - Dış Giyim ---
                [
                    'sku' => 'ER-DIS-001', 'barcode' => '8690001200007',
                    'name' => 'Deri Ceket',
                    'description' => '<p>Gerçek deri erkek ceket. Klasik biker stil.</p>',
                    'short_description' => 'Gerçek deri, biker stil erkek ceket.',
                    'price' => 2499.90, 'compare_price' => 3499.90, 'cost_price' => 900.00,
                    'currency' => 'TRY', 'stock_quantity' => 30, 'stock_status' => 'in_stock',
                    'weight' => 1.50, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['zara'], 'category_id' => $categoryIds['erkek-dis-giyim'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 1,
                ],

                // --- Kadın - Dış Giyim ---
                [
                    'sku' => 'KD-DIS-001', 'barcode' => '8690001100008',
                    'name' => 'Oversize Trençkot',
                    'description' => '<p>Klasik oversize trençkot. Su itici kumaş, bağlama detaylı.</p>',
                    'short_description' => 'Oversize fit, su itici trençkot.',
                    'price' => 1299.90, 'compare_price' => 1799.90, 'cost_price' => 500.00,
                    'currency' => 'TRY', 'stock_quantity' => 50, 'stock_status' => 'in_stock',
                    'weight' => 0.80, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['mango'], 'category_id' => $categoryIds['kadin-dis-giyim'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => true, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 1,
                ],

                // --- Spor Giyim ---
                [
                    'sku' => 'SP-ESF-001', 'barcode' => '8690001300001',
                    'name' => 'Kadın Eşofman Takımı',
                    'description' => '<p>Rahat kesim kadın eşofman takımı. Spor ve günlük kullanım.</p>',
                    'short_description' => 'Kadın eşofman takımı, pamuklu kumaş.',
                    'price' => 599.90, 'compare_price' => 799.90, 'cost_price' => 240.00,
                    'currency' => 'TRY', 'stock_quantity' => 100, 'stock_status' => 'in_stock',
                    'weight' => 0.60, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['hm'], 'category_id' => $categoryIds['esofman-takimi'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => true, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 1,
                ],
                [
                    'sku' => 'SP-TSR-001', 'barcode' => '8690001300002',
                    'name' => 'Erkek Spor Tişört',
                    'description' => '<p>Nefes alan kumaştan üretilmiş erkek spor tişört. Egzersiz ve aktiviteler için.</p>',
                    'short_description' => 'Nefes alan kumaş, erkek spor tişört.',
                    'price' => 179.90, 'compare_price' => null, 'cost_price' => 70.00,
                    'currency' => 'TRY', 'stock_quantity' => 350, 'stock_status' => 'in_stock',
                    'weight' => 0.15, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['defacto'], 'category_id' => $categoryIds['spor-tisort'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 1,
                ],

                // --- Kadın - Etek ---
                [
                    'sku' => 'KD-ETK-001', 'barcode' => '8690001100009',
                    'name' => 'Pileli Midi Etek',
                    'description' => '<p>Zarif pileli midi etek. Şifon kumaş, astar detaylı.</p>',
                    'short_description' => 'Pileli şifon midi etek.',
                    'price' => 299.90, 'compare_price' => 399.90, 'cost_price' => 120.00,
                    'currency' => 'TRY', 'stock_quantity' => 75, 'stock_status' => 'in_stock',
                    'weight' => 0.25, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['koton'], 'category_id' => $categoryIds['etek'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 1,
                ],

                // --- Ayakkabı ---
                [
                    'sku' => 'AY-KDN-001', 'barcode' => '8690001400001',
                    'name' => 'Stiletto Topuklu Ayakkabı',
                    'description' => '<p>Zarif stiletto topuklu ayakkabı. 10cm topuk yüksekliği.</p>',
                    'short_description' => 'Stiletto topuklu kadın ayakkabı, 10cm.',
                    'price' => 599.90, 'compare_price' => 799.90, 'cost_price' => 240.00,
                    'currency' => 'TRY', 'stock_quantity' => 60, 'stock_status' => 'in_stock',
                    'weight' => 0.40, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['zara'], 'category_id' => $categoryIds['kadin-ayakkabi'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => true, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 1,
                ],
                [
                    'sku' => 'AY-ERK-001', 'barcode' => '8690001400002',
                    'name' => 'Deri Loafer Ayakkabı',
                    'description' => '<p>El yapımı deri loafer ayakkabı. Klasik ve şık tasarım.</p>',
                    'short_description' => 'El yapımı deri loafer erkek ayakkabı.',
                    'price' => 899.90, 'compare_price' => null, 'cost_price' => 360.00,
                    'currency' => 'TRY', 'stock_quantity' => 40, 'stock_status' => 'in_stock',
                    'weight' => 0.55, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['tommy-hilfiger'], 'category_id' => $categoryIds['erkek-ayakkabi'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 1,
                ],

                // --- Çanta ---
                [
                    'sku' => 'CN-KDN-001', 'barcode' => '8690001500001',
                    'name' => 'Deri Omuz Çantası',
                    'description' => '<p>Yumuşak deri omuz çantası. Ayarlanabilir askı, iç cepli.</p>',
                    'short_description' => 'Yumuşak deri kadın omuz çantası.',
                    'price' => 749.90, 'compare_price' => 999.90, 'cost_price' => 300.00,
                    'currency' => 'TRY', 'stock_quantity' => 55, 'stock_status' => 'in_stock',
                    'weight' => 0.50, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['mango'], 'category_id' => $categoryIds['kadin-canta'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => true, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 1,
                ],
            ];

            // Product images from Unsplash (fashion-related)
            $productImages = [
                'KD-ELB-001' => 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=1000&fit=crop&q=80',
                'KD-ELB-002' => 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&h=1000&fit=crop&q=80',
                'KD-ELB-003' => 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&h=1000&fit=crop&q=80',
                'KD-BLZ-001' => 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&h=1000&fit=crop&q=80',
                'KD-BLZ-002' => 'https://images.unsplash.com/photo-1551489186-cf8726f514f8?w=800&h=1000&fit=crop&q=80',
                'KD-PNT-001' => 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&h=1000&fit=crop&q=80',
                'KD-PNT-002' => 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1000&fit=crop&q=80',
                'ER-GML-001' => 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&h=1000&fit=crop&q=80',
                'ER-GML-002' => 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&h=1000&fit=crop&q=80',
                'ER-TSH-001' => 'https://images.unsplash.com/photo-1625910513413-5fc421e0fd6d?w=800&h=1000&fit=crop&q=80',
                'ER-TSH-002' => 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=1000&fit=crop&q=80',
                'ER-PNT-001' => 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&h=1000&fit=crop&q=80',
                'ER-PNT-002' => 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=1000&fit=crop&q=80',
                'ER-DIS-001' => 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=1000&fit=crop&q=80',
                'KD-DIS-001' => 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&h=1000&fit=crop&q=80',
                'SP-ESF-001' => 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=800&h=1000&fit=crop&q=80',
                'SP-TSR-001' => 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&h=1000&fit=crop&q=80',
                'KD-ETK-001' => 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&h=1000&fit=crop&q=80',
                'AY-KDN-001' => 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&h=1000&fit=crop&q=80',
                'AY-ERK-001' => 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&h=1000&fit=crop&q=80',
                'CN-KDN-001' => 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=1000&fit=crop&q=80',
            ];

            foreach ($products as $productData) {
                $sku = $productData['sku'];
                $product = Product::create($productData);

                // Add main image
                if (isset($productImages[$sku])) {
                    DB::table('product_images')->insert([
                        'product_id' => $product->id,
                        'image_url' => $productImages[$sku],
                        'sort_order' => 1,
                        'is_main' => true,
                        'alt_text' => $product->name,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            // Update category product counts
            $categoryCounts = DB::table('products')
                ->where('is_active', true)
                ->whereNull('deleted_at')
                ->select('category_id', DB::raw('count(*) as cnt'))
                ->groupBy('category_id')
                ->pluck('cnt', 'category_id');

            foreach ($categoryCounts as $catId => $count) {
                DB::table('categories')->where('id', $catId)->update(['product_count' => $count]);
            }
        });
    }
}
