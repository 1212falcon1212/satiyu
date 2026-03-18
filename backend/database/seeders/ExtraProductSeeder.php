<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ExtraProductSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $brandIds = DB::table('brands')->pluck('id', 'slug')->toArray();
            $categoryIds = DB::table('categories')->pluck('id', 'slug')->toArray();

            // Variant type IDs
            $colorTypeId = 1; // Renk
            $sizeTypeId = 2;  // Beden

            // Variant option IDs (colors)
            $siyah = 1;
            $beyaz = 2;
            $lacivert = 3;
            $kirmizi = 4;
            $bej = 5;
            $haki = 6;
            $pembe = 7;

            // Variant option IDs (sizes)
            $xs = 8;
            $s = 9;
            $m = 10;
            $l = 11;
            $xl = 12;
            $xxl = 13;

            $products = [
                // 1 - Elbiseler
                [
                    'sku' => 'KD-ELB-010',
                    'barcode' => '8690002100001',
                    'name' => 'Asimetrik Kesim Abiye Elbise',
                    'description' => '<p>Asimetrik kesimli zarif abiye elbise. İnce askılı, sırt dekolteli tasarım. Özel geceler için ideal.</p><ul><li>Kumaş: %95 Polyester, %5 Elastan</li><li>Boy: Uzun</li><li>Yaka: Askılı</li></ul>',
                    'short_description' => 'Asimetrik kesim, askılı abiye elbise.',
                    'price' => 1299.90, 'compare_price' => 1799.90, 'cost_price' => 500.00,
                    'currency' => 'TRY', 'stock_quantity' => 60, 'stock_status' => 'in_stock',
                    'weight' => 0.45, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['zara'], 'category_id' => $categoryIds['elbiseler'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => true, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 4,
                    'images' => [
                        'https://images.unsplash.com/photo-1518577915332-c2a19f149a75?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$siyah], 'sizes' => [$s, $m, $l], 'price_offset' => 0, 'stock' => 20],
                        ['colors' => [$kirmizi], 'sizes' => [$s, $m], 'price_offset' => 30, 'stock' => 15],
                        ['colors' => [$lacivert], 'sizes' => [$m, $l, $xl], 'price_offset' => 0, 'stock' => 25],
                    ],
                ],

                // 2 - Bluz & Gömlek
                [
                    'sku' => 'KD-BLZ-010',
                    'barcode' => '8690002100002',
                    'name' => 'Fırfır Detaylı Şifon Bluz',
                    'description' => '<p>Fırfır detaylı şifon bluz. Romantik ve feminen bir görünüm sunar. Ofis ve davet kullanımına uygun.</p>',
                    'short_description' => 'Fırfır detaylı, şifon kumaş bluz.',
                    'price' => 349.90, 'compare_price' => 499.90, 'cost_price' => 140.00,
                    'currency' => 'TRY', 'stock_quantity' => 130, 'stock_status' => 'in_stock',
                    'weight' => 0.18, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['mango'], 'category_id' => $categoryIds['bluz-gomlek'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 3,
                    'images' => [
                        'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1604695573706-53170668f6a6?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$beyaz], 'sizes' => [$xs, $s, $m], 'price_offset' => 0, 'stock' => 40],
                        ['colors' => [$pembe], 'sizes' => [$s, $m, $l], 'price_offset' => 10, 'stock' => 45],
                        ['colors' => [$bej], 'sizes' => [$m, $l], 'price_offset' => 0, 'stock' => 30],
                    ],
                ],

                // 3 - Kadın Pantolon
                [
                    'sku' => 'KD-PNT-010',
                    'barcode' => '8690002100003',
                    'name' => 'Kumaş Cigarette Pantolon',
                    'description' => '<p>Dar paça kumaş cigarette pantolon. Ofis şıklığını günlük hayata taşıyın.</p><ul><li>Kumaş: %65 Polyester, %30 Viskon, %5 Elastan</li><li>Bel: Yüksek bel</li></ul>',
                    'short_description' => 'Yüksek bel kumaş cigarette pantolon.',
                    'price' => 449.90, 'compare_price' => null, 'cost_price' => 180.00,
                    'currency' => 'TRY', 'stock_quantity' => 180, 'stock_status' => 'in_stock',
                    'weight' => 0.40, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['koton'], 'category_id' => $categoryIds['kadin-pantolon'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => true, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 3,
                    'images' => [
                        'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1551854838-212c50b4c184?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$siyah], 'sizes' => [$s, $m, $l, $xl], 'price_offset' => 0, 'stock' => 50],
                        ['colors' => [$bej], 'sizes' => [$xs, $s, $m, $l], 'price_offset' => 0, 'stock' => 45],
                        ['colors' => [$lacivert], 'sizes' => [$m, $l], 'price_offset' => 20, 'stock' => 35],
                    ],
                ],

                // 4 - Etek
                [
                    'sku' => 'KD-ETK-010',
                    'barcode' => '8690002100004',
                    'name' => 'Deri Görünümlü Mini Etek',
                    'description' => '<p>Deri görünümlü A-line mini etek. Fermuarlı arka kapama. Tişört ve bluzlarla harika kombinlenir.</p>',
                    'short_description' => 'Deri görünümlü, A-line mini etek.',
                    'price' => 279.90, 'compare_price' => 379.90, 'cost_price' => 110.00,
                    'currency' => 'TRY', 'stock_quantity' => 95, 'stock_status' => 'in_stock',
                    'weight' => 0.30, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['zara'], 'category_id' => $categoryIds['etek'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 2,
                    'images' => [
                        'https://images.unsplash.com/photo-1592301933927-35b597393c0a?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1577900232427-18219b9166a0?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$siyah], 'sizes' => [$xs, $s, $m, $l], 'price_offset' => 0, 'stock' => 30],
                        ['colors' => [$kirmizi], 'sizes' => [$s, $m], 'price_offset' => 20, 'stock' => 20],
                        ['colors' => [$bej], 'sizes' => [$s, $m, $l], 'price_offset' => 0, 'stock' => 25],
                    ],
                ],

                // 5 - Kadın Dış Giyim
                [
                    'sku' => 'KD-DIS-010',
                    'barcode' => '8690002100005',
                    'name' => 'Kadın Blazer Ceket',
                    'description' => '<p>Tek düğmeli kadın blazer ceket. Slim fit kesim, astarlı. Ofis ve davet kombinleri için vazgeçilmez.</p>',
                    'short_description' => 'Slim fit, tek düğmeli kadın blazer ceket.',
                    'price' => 899.90, 'compare_price' => 1199.90, 'cost_price' => 350.00,
                    'currency' => 'TRY', 'stock_quantity' => 70, 'stock_status' => 'in_stock',
                    'weight' => 0.60, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['calvin-klein'], 'category_id' => $categoryIds['kadin-dis-giyim'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => true, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 2,
                    'images' => [
                        'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$siyah], 'sizes' => [$s, $m, $l], 'price_offset' => 0, 'stock' => 25],
                        ['colors' => [$beyaz], 'sizes' => [$s, $m], 'price_offset' => 30, 'stock' => 20],
                        ['colors' => [$bej], 'sizes' => [$m, $l, $xl], 'price_offset' => 0, 'stock' => 25],
                    ],
                ],

                // 6 - Erkek Gömlek
                [
                    'sku' => 'ER-GML-010',
                    'barcode' => '8690002100006',
                    'name' => 'Regular Fit Ekose Gömlek',
                    'description' => '<p>Ekose desenli regular fit gömlek. %100 pamuk flannel kumaş. Sonbahar ve kış mevsimi için ideal.</p>',
                    'short_description' => 'Ekose desenli, %100 pamuk flannel gömlek.',
                    'price' => 329.90, 'compare_price' => null, 'cost_price' => 130.00,
                    'currency' => 'TRY', 'stock_quantity' => 200, 'stock_status' => 'in_stock',
                    'weight' => 0.28, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['tommy-hilfiger'], 'category_id' => $categoryIds['erkek-gomlek'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => true, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 3,
                    'images' => [
                        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$kirmizi], 'sizes' => [$m, $l, $xl, $xxl], 'price_offset' => 0, 'stock' => 50],
                        ['colors' => [$lacivert], 'sizes' => [$s, $m, $l, $xl], 'price_offset' => 0, 'stock' => 55],
                        ['colors' => [$haki], 'sizes' => [$m, $l], 'price_offset' => 10, 'stock' => 40],
                    ],
                ],

                // 7 - T-Shirt & Polo
                [
                    'sku' => 'ER-TSH-010',
                    'barcode' => '8690002100007',
                    'name' => 'Slim Fit V Yaka T-Shirt',
                    'description' => '<p>Slim fit V yaka basic t-shirt. %100 pamuk süprem kumaş. Günlük kullanım için temel parça.</p>',
                    'short_description' => 'Slim fit, V yaka %100 pamuk t-shirt.',
                    'price' => 129.90, 'compare_price' => 179.90, 'cost_price' => 50.00,
                    'currency' => 'TRY', 'stock_quantity' => 500, 'stock_status' => 'in_stock',
                    'weight' => 0.18, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['defacto'], 'category_id' => $categoryIds['tshirt-polo'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 3,
                    'images' => [
                        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$siyah], 'sizes' => [$s, $m, $l, $xl, $xxl], 'price_offset' => 0, 'stock' => 100],
                        ['colors' => [$beyaz], 'sizes' => [$s, $m, $l, $xl], 'price_offset' => 0, 'stock' => 90],
                        ['colors' => [$lacivert], 'sizes' => [$m, $l, $xl], 'price_offset' => 0, 'stock' => 80],
                        ['colors' => [$haki], 'sizes' => [$s, $m, $l], 'price_offset' => 10, 'stock' => 60],
                    ],
                ],

                // 8 - Erkek Pantolon
                [
                    'sku' => 'ER-PNT-010',
                    'barcode' => '8690002100008',
                    'name' => 'Kargo Pantolon',
                    'description' => '<p>Bol cepli kargo pantolon. Dayanıklı pamuklu kumaş, günlük ve outdoor kullanıma uygun.</p>',
                    'short_description' => 'Bol cepli, dayanıklı kargo pantolon.',
                    'price' => 399.90, 'compare_price' => 549.90, 'cost_price' => 160.00,
                    'currency' => 'TRY', 'stock_quantity' => 150, 'stock_status' => 'in_stock',
                    'weight' => 0.55, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['lc-waikiki'], 'category_id' => $categoryIds['erkek-pantolon'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 3,
                    'images' => [
                        'https://images.unsplash.com/photo-1517438476312-10d79c077509?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$haki], 'sizes' => [$m, $l, $xl, $xxl], 'price_offset' => 0, 'stock' => 40],
                        ['colors' => [$siyah], 'sizes' => [$s, $m, $l, $xl], 'price_offset' => 0, 'stock' => 50],
                        ['colors' => [$bej], 'sizes' => [$m, $l, $xl], 'price_offset' => 10, 'stock' => 35],
                    ],
                ],

                // 9 - Takım Elbise
                [
                    'sku' => 'ER-TKM-010',
                    'barcode' => '8690002100009',
                    'name' => 'Slim Fit Takım Elbise',
                    'description' => '<p>İtalyan kesim slim fit takım elbise. Ceket ve pantolon takım. Düğün, iş toplantıları ve özel günler için.</p><ul><li>Kumaş: %70 Yün, %30 Polyester</li><li>Astar: %100 Polyester</li></ul>',
                    'short_description' => 'İtalyan kesim slim fit takım elbise seti.',
                    'price' => 2999.90, 'compare_price' => null, 'cost_price' => 1200.00,
                    'currency' => 'TRY', 'stock_quantity' => 35, 'stock_status' => 'in_stock',
                    'weight' => 1.20, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['calvin-klein'], 'category_id' => $categoryIds['takim-elbise'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 1,
                    'images' => [
                        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1507679799987-c73b7651f124?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$siyah], 'sizes' => [$s, $m, $l, $xl], 'price_offset' => 0, 'stock' => 10],
                        ['colors' => [$lacivert], 'sizes' => [$m, $l, $xl], 'price_offset' => 0, 'stock' => 12],
                        ['colors' => [$bej], 'sizes' => [$m, $l], 'price_offset' => 30, 'stock' => 8],
                    ],
                ],

                // 10 - Erkek Dış Giyim
                [
                    'sku' => 'ER-DIS-010',
                    'barcode' => '8690002100010',
                    'name' => 'Kapitone Mont',
                    'description' => '<p>Su geçirmez kapitone mont. Hafif ve sıcak tutan dolgulu tasarım. Kapüşonlu.</p>',
                    'short_description' => 'Su geçirmez, kapüşonlu kapitone mont.',
                    'price' => 1499.90, 'compare_price' => 1999.90, 'cost_price' => 600.00,
                    'currency' => 'TRY', 'stock_quantity' => 45, 'stock_status' => 'in_stock',
                    'weight' => 0.90, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['polo-ralph-lauren'], 'category_id' => $categoryIds['erkek-dis-giyim'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => true, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 2,
                    'images' => [
                        'https://images.unsplash.com/photo-1544923246-77307dd270cb?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$siyah], 'sizes' => [$m, $l, $xl, $xxl], 'price_offset' => 0, 'stock' => 15],
                        ['colors' => [$lacivert], 'sizes' => [$s, $m, $l, $xl], 'price_offset' => 0, 'stock' => 15],
                        ['colors' => [$haki], 'sizes' => [$l, $xl], 'price_offset' => 20, 'stock' => 10],
                    ],
                ],

                // 11 - Kadın Ayakkabı
                [
                    'sku' => 'AY-KDN-010',
                    'barcode' => '8690002100011',
                    'name' => 'Platform Tabanlı Sneaker',
                    'description' => '<p>Platform tabanlı kadın sneaker. Yükseltilmiş taban, günlük kullanıma uygun konforlu tasarım.</p>',
                    'short_description' => 'Platform tabanlı, günlük kadın sneaker.',
                    'price' => 549.90, 'compare_price' => null, 'cost_price' => 220.00,
                    'currency' => 'TRY', 'stock_quantity' => 80, 'stock_status' => 'in_stock',
                    'weight' => 0.45, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['lacoste'], 'category_id' => $categoryIds['kadin-ayakkabi'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => true, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 2,
                    'images' => [
                        'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$beyaz], 'sizes' => [$s, $m, $l], 'price_offset' => 0, 'stock' => 30],
                        ['colors' => [$siyah], 'sizes' => [$s, $m, $l], 'price_offset' => 0, 'stock' => 30],
                        ['colors' => [$pembe], 'sizes' => [$s, $m], 'price_offset' => 20, 'stock' => 20],
                    ],
                ],

                // 12 - Erkek Ayakkabı
                [
                    'sku' => 'AY-ERK-010',
                    'barcode' => '8690002100012',
                    'name' => 'Klasik Oxford Ayakkabı',
                    'description' => '<p>Gerçek deri klasik Oxford ayakkabı. Kösele taban, el dikişi detayları. Takım elbise ve resmi kombinler için.</p>',
                    'short_description' => 'Gerçek deri, kösele tabanlı Oxford ayakkabı.',
                    'price' => 1199.90, 'compare_price' => 1599.90, 'cost_price' => 480.00,
                    'currency' => 'TRY', 'stock_quantity' => 40, 'stock_status' => 'in_stock',
                    'weight' => 0.65, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['polo-ralph-lauren'], 'category_id' => $categoryIds['erkek-ayakkabi'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 2,
                    'images' => [
                        'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$siyah], 'sizes' => [$m, $l, $xl], 'price_offset' => 0, 'stock' => 15],
                        ['colors' => [$bej], 'sizes' => [$m, $l], 'price_offset' => 30, 'stock' => 12],
                    ],
                ],

                // 13 - Spor Ayakkabı
                [
                    'sku' => 'AY-SPR-010',
                    'barcode' => '8690002100013',
                    'name' => 'Koşu Ayakkabısı Ultra Boost',
                    'description' => '<p>Yüksek performanslı koşu ayakkabısı. Hafif yapı, nefes alan üst materyal, yastıklı taban teknolojisi.</p>',
                    'short_description' => 'Hafif, nefes alan koşu ayakkabısı.',
                    'price' => 799.90, 'compare_price' => 1099.90, 'cost_price' => 320.00,
                    'currency' => 'TRY', 'stock_quantity' => 120, 'stock_status' => 'in_stock',
                    'weight' => 0.35, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['lacoste'], 'category_id' => $categoryIds['spor-ayakkabi'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => true, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 1,
                    'images' => [
                        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$siyah], 'sizes' => [$s, $m, $l, $xl], 'price_offset' => 0, 'stock' => 30],
                        ['colors' => [$beyaz], 'sizes' => [$s, $m, $l], 'price_offset' => 0, 'stock' => 30],
                        ['colors' => [$kirmizi], 'sizes' => [$m, $l, $xl], 'price_offset' => 20, 'stock' => 25],
                        ['colors' => [$lacivert], 'sizes' => [$m, $l], 'price_offset' => 0, 'stock' => 20],
                    ],
                ],

                // 14 - Kadın Çanta
                [
                    'sku' => 'CN-KDN-010',
                    'barcode' => '8690002100014',
                    'name' => 'Mini Crossbody Çanta',
                    'description' => '<p>Kompakt mini crossbody çanta. Ayarlanabilir zincir askı, manyetik kapama. Telefon ve küçük eşyalar için ideal.</p>',
                    'short_description' => 'Zincir askılı mini crossbody çanta.',
                    'price' => 499.90, 'compare_price' => 699.90, 'cost_price' => 200.00,
                    'currency' => 'TRY', 'stock_quantity' => 85, 'stock_status' => 'in_stock',
                    'weight' => 0.30, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['mango'], 'category_id' => $categoryIds['kadin-canta'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 2,
                    'images' => [
                        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$siyah], 'sizes' => [$m], 'price_offset' => 0, 'stock' => 30],
                        ['colors' => [$beyaz], 'sizes' => [$m], 'price_offset' => 0, 'stock' => 25],
                        ['colors' => [$kirmizi], 'sizes' => [$m], 'price_offset' => 20, 'stock' => 15],
                        ['colors' => [$bej], 'sizes' => [$m], 'price_offset' => 0, 'stock' => 15],
                    ],
                ],

                // 15 - Eşofman Takımı
                [
                    'sku' => 'SP-ESF-010',
                    'barcode' => '8690002100015',
                    'name' => 'Erkek Eşofman Takımı Premium',
                    'description' => '<p>Premium kalite erkek eşofman takımı. Kapüşonlu üst ve jogger alt. Pamuk-polyester karışım kumaş.</p>',
                    'short_description' => 'Kapüşonlu, premium erkek eşofman takımı.',
                    'price' => 749.90, 'compare_price' => 999.90, 'cost_price' => 300.00,
                    'currency' => 'TRY', 'stock_quantity' => 110, 'stock_status' => 'in_stock',
                    'weight' => 0.70, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['tommy-hilfiger'], 'category_id' => $categoryIds['esofman-takimi'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 2,
                    'images' => [
                        'https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$siyah], 'sizes' => [$s, $m, $l, $xl, $xxl], 'price_offset' => 0, 'stock' => 25],
                        ['colors' => [$lacivert], 'sizes' => [$m, $l, $xl], 'price_offset' => 0, 'stock' => 20],
                        ['colors' => [$haki], 'sizes' => [$m, $l, $xl], 'price_offset' => 10, 'stock' => 20],
                    ],
                ],

                // 16 - Spor Tişört
                [
                    'sku' => 'SP-TSR-010',
                    'barcode' => '8690002100016',
                    'name' => 'Kadın Spor Crop Top',
                    'description' => '<p>Yüksek destekli kadın spor crop top. Nem emici teknoloji, nefes alan kumaş. Yoga ve fitness için ideal.</p>',
                    'short_description' => 'Nem emici, yüksek destekli spor crop top.',
                    'price' => 199.90, 'compare_price' => 279.90, 'cost_price' => 80.00,
                    'currency' => 'TRY', 'stock_quantity' => 220, 'stock_status' => 'in_stock',
                    'weight' => 0.12, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['koton'], 'category_id' => $categoryIds['spor-tisort'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => true, 'show_on_homepage' => false,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 2,
                    'images' => [
                        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$siyah], 'sizes' => [$xs, $s, $m, $l], 'price_offset' => 0, 'stock' => 60],
                        ['colors' => [$pembe], 'sizes' => [$xs, $s, $m], 'price_offset' => 0, 'stock' => 50],
                        ['colors' => [$beyaz], 'sizes' => [$s, $m, $l], 'price_offset' => 0, 'stock' => 55],
                    ],
                ],

                // 17 - Kız Çocuk
                [
                    'sku' => 'CC-KIZ-010',
                    'barcode' => '8690002100017',
                    'name' => 'Kız Çocuk Tütü Elbise',
                    'description' => '<p>Tül etekli kız çocuk elbise. Pamuklu üst, kabarık tül etek. Doğum günleri ve özel günler için.</p>',
                    'short_description' => 'Tül etekli, pamuklu kız çocuk elbise.',
                    'price' => 249.90, 'compare_price' => 349.90, 'cost_price' => 100.00,
                    'currency' => 'TRY', 'stock_quantity' => 150, 'stock_status' => 'in_stock',
                    'weight' => 0.20, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['lc-waikiki'], 'category_id' => $categoryIds['kiz-cocuk'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => false, 'show_on_homepage' => false,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 1,
                    'images' => [
                        'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1543854589-fba056acfe68?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1476234251651-f353703a034d?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$pembe], 'sizes' => [$xs, $s, $m], 'price_offset' => 0, 'stock' => 50],
                        ['colors' => [$beyaz], 'sizes' => [$xs, $s, $m], 'price_offset' => 0, 'stock' => 50],
                        ['colors' => [$kirmizi], 'sizes' => [$xs, $s], 'price_offset' => 10, 'stock' => 30],
                    ],
                ],

                // 18 - Erkek Çocuk
                [
                    'sku' => 'CC-ERK-010',
                    'barcode' => '8690002100018',
                    'name' => 'Erkek Çocuk Kapüşonlu Sweatshirt',
                    'description' => '<p>Baskı detaylı erkek çocuk kapüşonlu sweatshirt. %100 pamuk, içi tüylü kumaş. Soğuk günler için ideal.</p>',
                    'short_description' => 'Baskılı, kapüşonlu erkek çocuk sweatshirt.',
                    'price' => 199.90, 'compare_price' => null, 'cost_price' => 80.00,
                    'currency' => 'TRY', 'stock_quantity' => 180, 'stock_status' => 'in_stock',
                    'weight' => 0.30, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['defacto'], 'category_id' => $categoryIds['erkek-cocuk'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => false, 'show_on_homepage' => false,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 1,
                    'images' => [
                        'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$lacivert], 'sizes' => [$xs, $s, $m], 'price_offset' => 0, 'stock' => 60],
                        ['colors' => [$siyah], 'sizes' => [$xs, $s, $m, $l], 'price_offset' => 0, 'stock' => 65],
                        ['colors' => [$haki], 'sizes' => [$s, $m], 'price_offset' => 10, 'stock' => 40],
                    ],
                ],

                // 19 - Elbiseler (2nd)
                [
                    'sku' => 'KD-ELB-011',
                    'barcode' => '8690002100019',
                    'name' => 'Bohem Tarzı Maxi Elbise',
                    'description' => '<p>Bohem tarzı desenli maxi elbise. Volanlı etek, düğme detaylı üst kısım. Tatil ve günlük kullanım.</p>',
                    'short_description' => 'Bohem tarzı, volanlı maxi elbise.',
                    'price' => 599.90, 'compare_price' => null, 'cost_price' => 240.00,
                    'currency' => 'TRY', 'stock_quantity' => 75, 'stock_status' => 'in_stock',
                    'weight' => 0.35, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['hm'], 'category_id' => $categoryIds['elbiseler'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => true, 'show_on_homepage' => false,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 5,
                    'images' => [
                        'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1590548784585-643d2b9f2925?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$bej], 'sizes' => [$xs, $s, $m, $l], 'price_offset' => 0, 'stock' => 25],
                        ['colors' => [$kirmizi], 'sizes' => [$s, $m, $l], 'price_offset' => 20, 'stock' => 20],
                        ['colors' => [$haki], 'sizes' => [$m, $l], 'price_offset' => 0, 'stock' => 15],
                    ],
                ],

                // 20 - T-Shirt & Polo (2nd)
                [
                    'sku' => 'ER-TSH-011',
                    'barcode' => '8690002100020',
                    'name' => 'Çizgili Polo Yaka T-Shirt',
                    'description' => '<p>Klasik çizgili polo yaka t-shirt. Pamuk pique kumaş, nakış logo detay. Smart casual kombinler için.</p>',
                    'short_description' => 'Çizgili, polo yaka pamuk t-shirt.',
                    'price' => 349.90, 'compare_price' => 449.90, 'cost_price' => 140.00,
                    'currency' => 'TRY', 'stock_quantity' => 250, 'stock_status' => 'in_stock',
                    'weight' => 0.22, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['lacoste'], 'category_id' => $categoryIds['tshirt-polo'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 4,
                    'images' => [
                        'https://images.unsplash.com/photo-1625910513413-5fc421e0fd6d?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$lacivert], 'sizes' => [$s, $m, $l, $xl], 'price_offset' => 0, 'stock' => 60],
                        ['colors' => [$beyaz], 'sizes' => [$m, $l, $xl], 'price_offset' => 0, 'stock' => 55],
                        ['colors' => [$kirmizi], 'sizes' => [$s, $m, $l], 'price_offset' => 10, 'stock' => 45],
                    ],
                ],

                // 21 - Kadın Çanta (2nd)
                [
                    'sku' => 'CN-KDN-011',
                    'barcode' => '8690002100021',
                    'name' => 'Deri Tote Çanta',
                    'description' => '<p>Geniş hacimli deri tote çanta. Laptop bölmesi, iç organizatör cepleri. İş ve günlük kullanıma uygun.</p>',
                    'short_description' => 'Laptop bölmeli, geniş hacimli deri tote çanta.',
                    'price' => 999.90, 'compare_price' => null, 'cost_price' => 400.00,
                    'currency' => 'TRY', 'stock_quantity' => 50, 'stock_status' => 'in_stock',
                    'weight' => 0.65, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['calvin-klein'], 'category_id' => $categoryIds['kadin-canta'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => false, 'show_on_homepage' => false,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 3,
                    'images' => [
                        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$siyah], 'sizes' => [$m], 'price_offset' => 0, 'stock' => 20],
                        ['colors' => [$bej], 'sizes' => [$m], 'price_offset' => 30, 'stock' => 15],
                        ['colors' => [$lacivert], 'sizes' => [$m], 'price_offset' => 0, 'stock' => 15],
                    ],
                ],

                // 22 - Erkek Gömlek (2nd)
                [
                    'sku' => 'ER-GML-011',
                    'barcode' => '8690002100022',
                    'name' => 'Oversize Denim Gömlek',
                    'description' => '<p>Oversize fit denim gömlek. Çift cepli, düğme kapama. Jean ve chino pantolonlarla mükemmel uyum.</p>',
                    'short_description' => 'Oversize fit, çift cepli denim gömlek.',
                    'price' => 449.90, 'compare_price' => 599.90, 'cost_price' => 180.00,
                    'currency' => 'TRY', 'stock_quantity' => 130, 'stock_status' => 'in_stock',
                    'weight' => 0.35, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['koton'], 'category_id' => $categoryIds['erkek-gomlek'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => true, 'show_on_homepage' => false,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 4,
                    'images' => [
                        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1604695573706-53170668f6a6?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$lacivert], 'sizes' => [$s, $m, $l, $xl], 'price_offset' => 0, 'stock' => 40],
                        ['colors' => [$beyaz], 'sizes' => [$m, $l, $xl], 'price_offset' => 20, 'stock' => 35],
                        ['colors' => [$siyah], 'sizes' => [$m, $l], 'price_offset' => 0, 'stock' => 30],
                    ],
                ],

                // 23 - Kadın Dış Giyim (2nd)
                [
                    'sku' => 'KD-DIS-011',
                    'barcode' => '8690002100023',
                    'name' => 'Kadın Deri Biker Ceket',
                    'description' => '<p>Suni deri biker ceket. Fermuar detaylı, slim fit kesim. Rock ve casual stiller için vazgeçilmez.</p>',
                    'short_description' => 'Fermuar detaylı, suni deri biker ceket.',
                    'price' => 1199.90, 'compare_price' => 1599.90, 'cost_price' => 480.00,
                    'currency' => 'TRY', 'stock_quantity' => 55, 'stock_status' => 'in_stock',
                    'weight' => 0.75, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['zara'], 'category_id' => $categoryIds['kadin-dis-giyim'],
                    'is_active' => true, 'is_featured' => true, 'is_new' => false, 'show_on_homepage' => true,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 3,
                    'images' => [
                        'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$siyah], 'sizes' => [$xs, $s, $m, $l], 'price_offset' => 0, 'stock' => 20],
                        ['colors' => [$bej], 'sizes' => [$s, $m, $l], 'price_offset' => 30, 'stock' => 18],
                        ['colors' => [$kirmizi], 'sizes' => [$s, $m], 'price_offset' => 20, 'stock' => 12],
                    ],
                ],

                // 24 - Eşofman Takımı (2nd)
                [
                    'sku' => 'SP-ESF-011',
                    'barcode' => '8690002100024',
                    'name' => 'Velvet Kadın Eşofman Takımı',
                    'description' => '<p>Kadife kumaş kadın eşofman takımı. Fermuarlı üst, beli lastikli alt. Evde ve dışarıda şık görünüm.</p>',
                    'short_description' => 'Kadife kumaş, fermuarlı kadın eşofman takımı.',
                    'price' => 699.90, 'compare_price' => 899.90, 'cost_price' => 280.00,
                    'currency' => 'TRY', 'stock_quantity' => 90, 'stock_status' => 'in_stock',
                    'weight' => 0.65, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['hm'], 'category_id' => $categoryIds['esofman-takimi'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => false, 'show_on_homepage' => false,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 3,
                    'images' => [
                        'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$pembe], 'sizes' => [$xs, $s, $m, $l], 'price_offset' => 0, 'stock' => 25],
                        ['colors' => [$siyah], 'sizes' => [$s, $m, $l, $xl], 'price_offset' => 0, 'stock' => 30],
                        ['colors' => [$bej], 'sizes' => [$m, $l], 'price_offset' => 10, 'stock' => 20],
                    ],
                ],

                // 25 - Spor Ayakkabı (2nd)
                [
                    'sku' => 'AY-SPR-011',
                    'barcode' => '8690002100025',
                    'name' => 'Retro Sneaker Unisex',
                    'description' => '<p>Retro tasarımlı unisex sneaker. Süet ve deri karışım üst materyal. Günlük kullanım ve sokak stili.</p>',
                    'short_description' => 'Retro tasarım, süet-deri unisex sneaker.',
                    'price' => 649.90, 'compare_price' => null, 'cost_price' => 260.00,
                    'currency' => 'TRY', 'stock_quantity' => 160, 'stock_status' => 'in_stock',
                    'weight' => 0.42, 'width' => null, 'height' => null, 'length' => null,
                    'brand_id' => $brandIds['lc-waikiki'], 'category_id' => $categoryIds['spor-ayakkabi'],
                    'is_active' => true, 'is_featured' => false, 'is_new' => false, 'show_on_homepage' => false,
                    'meta_title' => null, 'meta_description' => null, 'sort_order' => 2,
                    'images' => [
                        'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&h=1000&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=1000&fit=crop&q=80',
                    ],
                    'variants' => [
                        ['colors' => [$beyaz], 'sizes' => [$s, $m, $l, $xl], 'price_offset' => 0, 'stock' => 40],
                        ['colors' => [$siyah], 'sizes' => [$s, $m, $l, $xl], 'price_offset' => 0, 'stock' => 40],
                        ['colors' => [$lacivert], 'sizes' => [$m, $l, $xl], 'price_offset' => 10, 'stock' => 35],
                        ['colors' => [$kirmizi], 'sizes' => [$m, $l], 'price_offset' => 20, 'stock' => 25],
                    ],
                ],
            ];

            $colorShortCodes = [
                $siyah => 'SYH',
                $beyaz => 'BYZ',
                $lacivert => 'LCV',
                $kirmizi => 'KRM',
                $bej => 'BEJ',
                $haki => 'HKI',
                $pembe => 'PMB',
            ];

            $sizeShortCodes = [
                $xs => 'XS',
                $s => 'S',
                $m => 'M',
                $l => 'L',
                $xl => 'XL',
                $xxl => 'XXL',
            ];

            foreach ($products as $productData) {
                $images = $productData['images'];
                $variantDefs = $productData['variants'];
                unset($productData['images'], $productData['variants']);

                $product = Product::create($productData);

                // Insert images
                foreach ($images as $index => $imageUrl) {
                    DB::table('product_images')->insert([
                        'product_id' => $product->id,
                        'image_url' => $imageUrl,
                        'sort_order' => $index + 1,
                        'is_main' => $index === 0,
                        'alt_text' => $product->name,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                // Link product to variant types
                DB::table('product_variant_types')->insert([
                    [
                        'product_id' => $product->id,
                        'variant_type_id' => $colorTypeId,
                        'sort_order' => 1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                    [
                        'product_id' => $product->id,
                        'variant_type_id' => $sizeTypeId,
                        'sort_order' => 2,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                ]);

                // Create variants
                $variantOrder = 0;
                foreach ($variantDefs as $variantDef) {
                    foreach ($variantDef['colors'] as $colorId) {
                        foreach ($variantDef['sizes'] as $sizeId) {
                            $variantOrder++;
                            $colorCode = $colorShortCodes[$colorId];
                            $sizeCode = $sizeShortCodes[$sizeId];
                            $variantSku = $product->sku . '-' . $colorCode . '-' . $sizeCode;

                            $variantPrice = $product->price + $variantDef['price_offset'];
                            $variantComparePrice = $product->compare_price
                                ? $product->compare_price + $variantDef['price_offset']
                                : null;

                            $variantId = DB::table('product_variants')->insertGetId([
                                'product_id' => $product->id,
                                'sku' => $variantSku,
                                'barcode' => null,
                                'price' => $variantPrice,
                                'compare_price' => $variantComparePrice,
                                'cost_price' => null,
                                'stock_quantity' => $variantDef['stock'],
                                'weight' => null,
                                'is_active' => true,
                                'sort_order' => $variantOrder,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);

                            DB::table('product_variant_values')->insert([
                                [
                                    'product_variant_id' => $variantId,
                                    'variant_option_id' => $colorId,
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ],
                                [
                                    'product_variant_id' => $variantId,
                                    'variant_option_id' => $sizeId,
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ],
                            ]);
                        }
                    }
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
