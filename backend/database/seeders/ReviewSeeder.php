<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ReviewSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $customers = DB::table('customers')->pluck('id')->toArray();
            $products = DB::table('products')->whereNull('deleted_at')->pluck('id', 'sku')->toArray();
            $orders = DB::table('orders')->pluck('id', 'customer_id')->toArray();

            if (empty($customers) || empty($products)) return;

            $reviews = [];

            $reviewData = [
                ['sku' => 'KD-ELB-001', 'ci' => 0, 'rating' => 5, 'title' => 'Çok Şık', 'comment' => 'Elbise tam beklediğim gibi çıktı. Kumaşı çok kaliteli ve renkleri canlı. Yaz düğünleri için mükemmel.', 'approved' => true, 'days' => 20],
                ['sku' => 'KD-ELB-001', 'ci' => 1, 'rating' => 4, 'title' => 'Güzel Elbise', 'comment' => 'Kalıp gayet iyi oturuyor. Sadece beden tablosu biraz küçük çıkıyor, bir beden büyük almanızı tavsiye ederim.', 'approved' => true, 'days' => 15],
                ['sku' => 'KD-ELB-002', 'ci' => 1, 'rating' => 5, 'title' => 'Harika Gece Elbisesi', 'comment' => 'Saten kumaşı muhteşem duruyor. Nişan törenimde giydim herkes çok beğendi.', 'approved' => true, 'days' => 12],
                ['sku' => 'KD-BLZ-001', 'ci' => 3, 'rating' => 4, 'title' => 'Şık Bluz', 'comment' => 'Ofiste hem şık hem rahat. Saten kumaşı ütü gerektirmiyor, çok pratik.', 'approved' => true, 'days' => 18],
                ['sku' => 'ER-GML-001', 'ci' => 0, 'rating' => 5, 'title' => 'Kaliteli Gömlek', 'comment' => 'Oxford kumaşı çok kaliteli. Slim fit kesim vücuda güzel oturuyor. Tommy kalitesi her zaman olduğu gibi üst düzey.', 'approved' => true, 'days' => 22],
                ['sku' => 'ER-GML-001', 'ci' => 2, 'rating' => 4, 'title' => 'İş İçin İdeal', 'comment' => 'Her gün ofiste giyiyorum. 5 yıkamadan sonra bile kalitesini koruyor.', 'approved' => true, 'days' => 10],
                ['sku' => 'ER-TSH-001', 'ci' => 0, 'rating' => 5, 'title' => 'En İyi Polo', 'comment' => 'Lacoste polo yaka kalitesi tartışılmaz. Pamuk kumaşı nefes aldırıyor, rengi solmuyor.', 'approved' => true, 'days' => 25],
                ['sku' => 'ER-TSH-001', 'ci' => 4, 'rating' => 4, 'title' => 'Güzel T-Shirt', 'comment' => 'Yaz için çok rahat. Biraz pahalı ama kalitesi fiyatını hak ediyor.', 'approved' => true, 'days' => 8],
                ['sku' => 'KD-PNT-001', 'ci' => 1, 'rating' => 5, 'title' => 'Mükemmel Jean', 'comment' => 'Yüksek bel olması çok güzel. Esnek kumaşı sayesinde gün boyu rahat.', 'approved' => true, 'days' => 14],
                ['sku' => 'ER-PNT-001', 'ci' => 2, 'rating' => 4, 'title' => 'Şık Pantolon', 'comment' => 'Chino pantolon hem iş hem günlük kullanıma uygun. Ralph Lauren kalitesi.', 'approved' => true, 'days' => 16],
                ['sku' => 'ER-DIS-001', 'ci' => 2, 'rating' => 5, 'title' => 'Muhteşem Ceket', 'comment' => 'Gerçek deri ceket bu fiyata bulmak zor. Kalıbı mükemmel oturuyor.', 'approved' => true, 'days' => 5],
                ['sku' => 'KD-DIS-001', 'ci' => 3, 'rating' => 5, 'title' => 'Harika Trençkot', 'comment' => 'Sonbahar için ideal. Su itici özelliği gerçekten çalışıyor, hafif yağmurda hiç ıslanmadım.', 'approved' => true, 'days' => 7],
                ['sku' => 'CN-KDN-001', 'ci' => 1, 'rating' => 4, 'title' => 'Güzel Çanta', 'comment' => 'Deri kalitesi çok iyi. İçi geniş, her şey sığıyor. Askı uzunluğu ayarlanabilir olması büyük artı.', 'approved' => true, 'days' => 9],
                ['sku' => 'AY-KDN-001', 'ci' => 3, 'rating' => 3, 'title' => 'Fena Değil', 'comment' => 'Ayakkabı güzel ama topuğu çok yüksek, uzun süre giymek zor. Kısa etkinlikler için ideal.', 'approved' => true, 'days' => 11],
                ['sku' => 'KD-ELB-003', 'ci' => 4, 'rating' => 4, 'title' => 'Sıcak Tutuyor', 'comment' => 'Kış için süper bir triko elbise. Kalın kumaşı sayesinde çok sıcak tutuyor.', 'approved' => false, 'days' => 3],
            ];

            foreach ($reviewData as $r) {
                if (!isset($products[$r['sku']]) || !isset($customers[$r['ci']])) continue;

                $reviews[] = [
                    'product_id' => $products[$r['sku']],
                    'customer_id' => $customers[$r['ci']],
                    'order_id' => $orders[$customers[$r['ci']]] ?? null,
                    'rating' => $r['rating'],
                    'title' => $r['title'],
                    'comment' => $r['comment'],
                    'is_approved' => $r['approved'],
                    'created_at' => now()->subDays($r['days']),
                    'updated_at' => now()->subDays($r['days']),
                ];
            }

            if (!empty($reviews)) {
                DB::table('reviews')->insert($reviews);
            }
        });
    }
}
