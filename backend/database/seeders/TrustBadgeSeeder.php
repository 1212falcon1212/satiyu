<?php

namespace Database\Seeders;

use App\Models\TrustBadge;
use Illuminate\Database\Seeder;

class TrustBadgeSeeder extends Seeder
{
    public function run(): void
    {
        $badges = [
            [
                'icon' => 'ShieldCheck',
                'title' => 'Güvenli Alışveriş',
                'description' => '256-bit SSL sertifikası ile güvenli satın alma',
                'sort_order' => 1,
            ],
            [
                'icon' => 'RefreshCw',
                'title' => 'Kolay İade ve Değişim',
                'description' => '14 gün içinde iade edebilme imkanı',
                'sort_order' => 2,
            ],
            [
                'icon' => 'Truck',
                'title' => 'Ücretsiz Kargo',
                'description' => '500 TL üzeri siparişlerde kargo ücretsiz',
                'sort_order' => 3,
            ],
            [
                'icon' => 'CreditCard',
                'title' => 'Taksit İmkanı',
                'description' => 'Vade farksız 4 aya varan taksit avantajı',
                'sort_order' => 4,
            ],
            [
                'icon' => 'Headphones',
                'title' => 'Telefon ile Destek',
                'description' => 'Çalışma saatleri 09:00 - 18:00 arası',
                'sort_order' => 5,
            ],
            [
                'icon' => 'Award',
                'title' => '%100 Memnuniyet',
                'description' => 'Müşteri memnuniyeti garantisi',
                'sort_order' => 6,
            ],
            [
                'icon' => 'MessageCircle',
                'title' => 'WhatsApp ile Sipariş',
                'description' => 'WhatsApp üzerinden hızlı sipariş hattı',
                'sort_order' => 7,
            ],
            [
                'icon' => 'Zap',
                'title' => 'Hızlı Gönderi',
                'description' => "15:00'a kadar verilen sipariş aynı gün kargoda",
                'sort_order' => 8,
            ],
        ];

        foreach ($badges as $badge) {
            TrustBadge::updateOrCreate(
                ['icon' => $badge['icon'], 'title' => $badge['title']],
                $badge
            );
        }
    }
}
