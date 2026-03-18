<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $customers = [
                Customer::create([
                    'name' => 'Ahmet Yilmaz',
                    'email' => 'ahmet.yilmaz@example.com',
                    'phone' => '05321234567',
                    'password' => 'password123',
                    'is_active' => true,
                ]),
                Customer::create([
                    'name' => 'Elif Kaya',
                    'email' => 'elif.kaya@example.com',
                    'phone' => '05339876543',
                    'password' => 'password123',
                    'is_active' => true,
                ]),
                Customer::create([
                    'name' => 'Mehmet Demir',
                    'email' => 'mehmet.demir@example.com',
                    'phone' => '05425551234',
                    'password' => 'password123',
                    'is_active' => true,
                ]),
                Customer::create([
                    'name' => 'Zeynep Arslan',
                    'email' => 'zeynep.arslan@example.com',
                    'phone' => '05317778899',
                    'password' => 'password123',
                    'is_active' => true,
                ]),
                Customer::create([
                    'name' => 'Can Ozturk',
                    'email' => 'can.ozturk@example.com',
                    'phone' => '05444443322',
                    'password' => 'password123',
                    'is_active' => true,
                ]),
            ];

            $addresses = [
                ['customer_id' => $customers[0]->id, 'title' => 'Ev Adresi', 'full_name' => 'Ahmet Yilmaz', 'phone' => '05321234567', 'city' => 'Istanbul', 'district' => 'Kadikoy', 'neighborhood' => 'Caferaga', 'address_line' => 'Moda Caddesi No: 45 Daire: 3', 'postal_code' => '34710', 'is_default' => true, 'created_at' => now(), 'updated_at' => now()],
                ['customer_id' => $customers[0]->id, 'title' => 'Is Adresi', 'full_name' => 'Ahmet Yilmaz', 'phone' => '05321234567', 'city' => 'Istanbul', 'district' => 'Sisli', 'neighborhood' => 'Mecidiyekoy', 'address_line' => 'Buyukdere Caddesi No: 128 Kat: 5', 'postal_code' => '34394', 'is_default' => false, 'created_at' => now(), 'updated_at' => now()],
                ['customer_id' => $customers[1]->id, 'title' => 'Ev Adresi', 'full_name' => 'Elif Kaya', 'phone' => '05339876543', 'city' => 'Ankara', 'district' => 'Cankaya', 'neighborhood' => 'Kizilay', 'address_line' => 'Ataturk Bulvari No: 87 Daire: 12', 'postal_code' => '06420', 'is_default' => true, 'created_at' => now(), 'updated_at' => now()],
                ['customer_id' => $customers[2]->id, 'title' => 'Ev Adresi', 'full_name' => 'Mehmet Demir', 'phone' => '05425551234', 'city' => 'Izmir', 'district' => 'Konak', 'neighborhood' => 'Alsancak', 'address_line' => 'Kibris Sehitleri Caddesi No: 22', 'postal_code' => '35220', 'is_default' => true, 'created_at' => now(), 'updated_at' => now()],
                ['customer_id' => $customers[3]->id, 'title' => 'Ev Adresi', 'full_name' => 'Zeynep Arslan', 'phone' => '05317778899', 'city' => 'Antalya', 'district' => 'Muratpasa', 'neighborhood' => 'Lara', 'address_line' => 'Lara Caddesi Palmiye Sitesi A Blok No: 8', 'postal_code' => '07230', 'is_default' => true, 'created_at' => now(), 'updated_at' => now()],
                ['customer_id' => $customers[4]->id, 'title' => 'Ev Adresi', 'full_name' => 'Can Ozturk', 'phone' => '05444443322', 'city' => 'Bursa', 'district' => 'Nilufer', 'neighborhood' => 'Ozluce', 'address_line' => 'Yesil Vadi Sitesi B Blok Daire: 15', 'postal_code' => '16110', 'is_default' => true, 'created_at' => now(), 'updated_at' => now()],
            ];

            DB::table('addresses')->insert($addresses);

            // Get products by SKU
            $products = DB::table('products')->whereIn('sku', [
                'KD-ELB-001', 'KD-BLZ-001', 'ER-GML-001', 'ER-TSH-001', 'KD-PNT-001', 'ER-DIS-001',
            ])->get();

            $p = fn($sku) => $products->where('sku', $sku)->first();

            // Order 1 - Ahmet (delivered)
            $prod1 = $p('ER-GML-001');
            $prod2 = $p('ER-TSH-001');

            if ($prod1 && $prod2) {
                $order1Id = DB::table('orders')->insertGetId([
                    'order_number' => 'MB-2025-0001',
                    'customer_id' => $customers[0]->id,
                    'status' => 'delivered',
                    'payment_status' => 'paid',
                    'payment_method' => 'credit_card',
                    'subtotal' => $prod1->price + $prod2->price,
                    'discount' => 0,
                    'shipping_cost' => 0,
                    'total' => $prod1->price + $prod2->price,
                    'shipping_address' => json_encode(['full_name' => 'Ahmet Yilmaz', 'phone' => '05321234567', 'city' => 'Istanbul', 'district' => 'Kadikoy', 'address_line' => 'Moda Caddesi No: 45 Daire: 3']),
                    'billing_address' => json_encode(['full_name' => 'Ahmet Yilmaz', 'phone' => '05321234567', 'city' => 'Istanbul', 'district' => 'Kadikoy', 'address_line' => 'Moda Caddesi No: 45 Daire: 3']),
                    'notes' => null,
                    'created_at' => now()->subDays(30),
                    'updated_at' => now()->subDays(25),
                ]);

                DB::table('order_items')->insert([
                    ['order_id' => $order1Id, 'product_id' => $prod1->id, 'product_variant_id' => null, 'product_name' => $prod1->name, 'sku' => $prod1->sku, 'quantity' => 1, 'unit_price' => $prod1->price, 'total_price' => $prod1->price, 'variant_info' => null, 'created_at' => now()->subDays(30), 'updated_at' => now()->subDays(30)],
                    ['order_id' => $order1Id, 'product_id' => $prod2->id, 'product_variant_id' => null, 'product_name' => $prod2->name, 'sku' => $prod2->sku, 'quantity' => 1, 'unit_price' => $prod2->price, 'total_price' => $prod2->price, 'variant_info' => null, 'created_at' => now()->subDays(30), 'updated_at' => now()->subDays(30)],
                ]);
            }

            // Order 2 - Elif (shipped)
            $prod3 = $p('KD-ELB-001');
            $prod4 = $p('KD-BLZ-001');

            if ($prod3 && $prod4) {
                $order2Id = DB::table('orders')->insertGetId([
                    'order_number' => 'MB-2025-0002',
                    'customer_id' => $customers[1]->id,
                    'status' => 'shipped',
                    'payment_status' => 'paid',
                    'payment_method' => 'credit_card',
                    'subtotal' => $prod3->price + $prod4->price,
                    'discount' => 0,
                    'shipping_cost' => 0,
                    'total' => $prod3->price + $prod4->price,
                    'shipping_address' => json_encode(['full_name' => 'Elif Kaya', 'phone' => '05339876543', 'city' => 'Ankara', 'district' => 'Cankaya', 'address_line' => 'Ataturk Bulvari No: 87 Daire: 12']),
                    'billing_address' => json_encode(['full_name' => 'Elif Kaya', 'phone' => '05339876543', 'city' => 'Ankara', 'district' => 'Cankaya', 'address_line' => 'Ataturk Bulvari No: 87 Daire: 12']),
                    'notes' => null,
                    'created_at' => now()->subDays(10),
                    'updated_at' => now()->subDays(8),
                ]);

                DB::table('order_items')->insert([
                    ['order_id' => $order2Id, 'product_id' => $prod3->id, 'product_variant_id' => null, 'product_name' => $prod3->name, 'sku' => $prod3->sku, 'quantity' => 1, 'unit_price' => $prod3->price, 'total_price' => $prod3->price, 'variant_info' => null, 'created_at' => now()->subDays(10), 'updated_at' => now()->subDays(10)],
                    ['order_id' => $order2Id, 'product_id' => $prod4->id, 'product_variant_id' => null, 'product_name' => $prod4->name, 'sku' => $prod4->sku, 'quantity' => 1, 'unit_price' => $prod4->price, 'total_price' => $prod4->price, 'variant_info' => null, 'created_at' => now()->subDays(10), 'updated_at' => now()->subDays(10)],
                ]);
            }

            // Order 3 - Mehmet (pending)
            $prod5 = $p('ER-DIS-001');

            if ($prod5) {
                $order3Id = DB::table('orders')->insertGetId([
                    'order_number' => 'MB-2025-0003',
                    'customer_id' => $customers[2]->id,
                    'status' => 'pending',
                    'payment_status' => 'pending',
                    'payment_method' => 'bank_transfer',
                    'subtotal' => $prod5->price,
                    'discount' => 0,
                    'shipping_cost' => 0,
                    'total' => $prod5->price,
                    'shipping_address' => json_encode(['full_name' => 'Mehmet Demir', 'phone' => '05425551234', 'city' => 'Izmir', 'district' => 'Konak', 'address_line' => 'Kibris Sehitleri Caddesi No: 22']),
                    'billing_address' => json_encode(['full_name' => 'Mehmet Demir', 'phone' => '05425551234', 'city' => 'Izmir', 'district' => 'Konak', 'address_line' => 'Kibris Sehitleri Caddesi No: 22']),
                    'notes' => null,
                    'created_at' => now()->subDays(2),
                    'updated_at' => now()->subDays(2),
                ]);

                DB::table('order_items')->insert([
                    ['order_id' => $order3Id, 'product_id' => $prod5->id, 'product_variant_id' => null, 'product_name' => $prod5->name, 'sku' => $prod5->sku, 'quantity' => 1, 'unit_price' => $prod5->price, 'total_price' => $prod5->price, 'variant_info' => null, 'created_at' => now()->subDays(2), 'updated_at' => now()->subDays(2)],
                ]);
            }
        });
    }
}
