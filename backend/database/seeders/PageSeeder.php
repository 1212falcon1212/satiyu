<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PageSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $pages = [
                [
                    'title' => 'Hakkımızda',
                    'slug' => 'hakkimizda',
                    'content' => '<h2>KampShop\'a Hoşgeldiniz</h2>
<p>KampShop, 2018 yılından bu yana Türkiye\'nin öncü kamp ve outdoor ekipman mağazası olarak hizmet vermektedir. Amacımız, doğa tutkunlarının ihtiyaç duyduğu tüm ekipmanları en kaliteli markalardan, en uygun fiyatlarla sunmaktır.</p>

<h3>Misyonumuz</h3>
<p>Doğa ile bağlantınızı güçlendirecek ekipmanları, uzman kadromuzun tavsiyeleri eşliğinde sizlere ulaştırmak. Her seviyeden kampçı ve doğasever için doğru ürünü bulmak konusunda yardımcı olmak en büyük önceliğimizdir.</p>

<h3>Vizyonumuz</h3>
<p>Türkiye\'nin en güvenilir ve en kapsamlı outdoor ekipman platformu olmak. Müşterilerimizin doğada güvenle vakit geçirmesini sağlayacak ürünleri sunarak, doğa sporlarının yaygınlaşmasına katkı sağlamak.</p>

<h3>Neden KampShop?</h3>
<ul>
<li><strong>Orijinal Ürünler:</strong> Tüm ürünlerimiz yetkili distribütörlerden temin edilmektedir.</li>
<li><strong>Uzman Kadro:</strong> Ekibimiz deneyimli kampçılardan oluşmaktadır.</li>
<li><strong>Hızlı Kargo:</strong> Siparişleriniz 24 saat içinde kargoya verilir.</li>
<li><strong>Kolay İade:</strong> 14 gün içinde koşulsuz iade garantisi.</li>
<li><strong>Güvenli Ödeme:</strong> 256-bit SSL sertifikası ile güvenli alışveriş.</li>
</ul>

<h3>İletişim</h3>
<p>Sorularınız için bize her zaman ulaşabilirsiniz. Müşteri hizmetlerimiz hafta içi 09:00-18:00 saatleri arasında hizmetinizdedir.</p>',
                    'is_active' => true,
                    'meta_title' => 'Hakkımızda | KampShop',
                    'meta_description' => 'KampShop hakkında bilgi edinin. Türkiye\'nin öncü kamp ve outdoor ekipman mağazası. Orijinal ürünler, uzman kadro, hızlı kargo.',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'title' => 'İletişim',
                    'slug' => 'iletisim',
                    'content' => '<h2>Bize Ulaşın</h2>
<p>Sorularınız, önerileriniz veya şikayet ve talepleriniz için aşağıdaki kanallardan bize ulaşabilirsiniz.</p>

<h3>İletişim Bilgileri</h3>
<ul>
<li><strong>Adres:</strong> Kadıköy, Moda Caddesi No: 128, 34710 İstanbul, Türkiye</li>
<li><strong>Telefon:</strong> +90 212 555 0123</li>
<li><strong>E-posta:</strong> info@kampshop.com.tr</li>
<li><strong>WhatsApp:</strong> +90 532 123 4567</li>
</ul>

<h3>Çalışma Saatleri</h3>
<ul>
<li><strong>Hafta içi:</strong> 09:00 - 18:00</li>
<li><strong>Cumartesi:</strong> 10:00 - 16:00</li>
<li><strong>Pazar:</strong> Kapalı</li>
</ul>

<h3>Sosyal Medya</h3>
<p>Bizi sosyal medya hesaplarımızdan takip ederek kampanyalardan ve yeni ürünlerden haberdar olabilirsiniz.</p>
<ul>
<li>Instagram: @kampshop</li>
<li>Facebook: /kampshop</li>
</ul>

<h3>Mağaza Adresi</h3>
<p>Showroom mağazamızı ziyaret ederek ürünleri yakından inceleyebilirsiniz. Randevu almanıza gerek yoktur.</p>',
                    'is_active' => true,
                    'meta_title' => 'İletişim | KampShop',
                    'meta_description' => 'KampShop iletişim bilgileri. Telefon, e-posta, WhatsApp ve mağaza adresi. Hafta içi 09:00-18:00.',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'title' => 'İade Politikası',
                    'slug' => 'iade-politikasi',
                    'content' => '<h2>İade ve Değişim Politikası</h2>
<p>KampShop olarak müşteri memnuniyetini ön planda tutuyoruz. Aşağıdaki koşullar çerçevesinde iade ve değişim işlemlerinizi gerçekleştirebilirsiniz.</p>

<h3>İade Koşulları</h3>
<ul>
<li>Ürünler, teslim tarihinden itibaren <strong>14 gün</strong> içinde iade edilebilir.</li>
<li>İade edilecek ürün, <strong>kullanılmamış</strong> ve <strong>orijinal ambalajında</strong> olmalıdır.</li>
<li>Ürün etiketi ve aksesuarları eksiksiz olarak iade edilmelidir.</li>
<li>Hijyen ürünleri (iç çamaşırı, mayo vb.) iade kapsamı dışındadır.</li>
</ul>

<h3>İade Süreci</h3>
<ol>
<li>Müşteri hizmetleri ile iletişime geçin veya hesabınızdan iade talebi oluşturun.</li>
<li>İade onayınız verildiğinde kargo kodunuz SMS ile iletilecektir.</li>
<li>Ürünü orijinal ambalajında, anlaşmalı kargo firmamıza teslim edin.</li>
<li>Ürün elimize ulaştıktan sonra <strong>3 iş günü</strong> içinde inceleme yapılır.</li>
<li>Onaylanan iadeler, ödeme yöntemine göre <strong>5-10 iş günü</strong> içinde hesabınıza yansır.</li>
</ol>

<h3>Değişim</h3>
<p>Beden veya renk değişimi için aynı süreçler geçerlidir. Değişim ürünleri stok durumuna bağlı olarak gönderilir.</p>

<h3>Hasar ve Kusur</h3>
<p>Ürün hasarlı veya kusurlu geldiğinde, teslim tarihinden itibaren 3 gün içinde fotoğraf ile birlikte bildirim yapmanız gerekmektedir. Kargo ücreti tarafımızca karşılanır.</p>

<h3>Kargo Ücreti</h3>
<p>Müşteriden kaynaklı iade ve değişimlerde kargo ücreti müşteriye aittir. Kusurlu veya hatalı ürün gönderimlerinde kargo ücreti KampShop tarafından karşılanır.</p>',
                    'is_active' => true,
                    'meta_title' => 'İade Politikası | KampShop',
                    'meta_description' => 'KampShop iade ve değişim politikası. 14 gün içinde koşulsuz iade. Detaylı bilgi için sayfamızı ziyaret edin.',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'title' => 'Gizlilik Politikası',
                    'slug' => 'gizlilik-politikasi',
                    'content' => '<h2>Gizlilik Politikası</h2>
<p>KampShop olarak kişisel verilerinizin korunmasına büyük önem veriyoruz. Bu gizlilik politikası, kişisel verilerinizin nasıl toplandığı, kullanıldığı ve korunduğu hakkında bilgi vermektedir.</p>

<h3>Toplanan Veriler</h3>
<p>Aşağıdaki kişisel veriler hizmet sunumu için toplanmaktadır:</p>
<ul>
<li><strong>Kimlik bilgileri:</strong> Ad, soyad</li>
<li><strong>İletişim bilgileri:</strong> E-posta adresi, telefon numarası, adres</li>
<li><strong>Ödeme bilgileri:</strong> Kredi kartı bilgileri (şifrelenmiş olarak saklanır)</li>
<li><strong>Kullanım verileri:</strong> Site ziyaret geçmişi, sipariş geçmişi</li>
</ul>

<h3>Verilerin Kullanım Amaçları</h3>
<ul>
<li>Sipariş işlemlerinin gerçekleştirilmesi</li>
<li>Müşteri hizmetleri desteği sağlanması</li>
<li>Kampanya ve promosyon bildirimleri (onayınız dahilinde)</li>
<li>Yasal yükümlülüklerin yerine getirilmesi</li>
<li>Site güvenliği ve dolandırıcılık önleme</li>
</ul>

<h3>Verilerin Paylaşılması</h3>
<p>Kişisel verileriniz aşağıdaki durumlar haricinde üçüncü taraflarla paylaşılmaz:</p>
<ul>
<li>Kargo firmaları (teslimat için gerekli bilgiler)</li>
<li>Ödeme altyapı sağlayıcıları (güvenli ödeme işlemleri için)</li>
<li>Yasal zorunluluklar (mahkeme kararı, yasal soruşturma vb.)</li>
</ul>

<h3>Veri Güvenliği</h3>
<p>Kişisel verileriniz 256-bit SSL sertifikası ile şifrelenerek korunmaktadır. Ödeme bilgileriniz PCI DSS uyumlu altyapıda işlenmektedir.</p>

<h3>Çerez Politikası</h3>
<p>Web sitemiz, kullanıcı deneyimini iyileştirmek için çerezler kullanmaktadır. Çerez tercihlerinizi tarayıcı ayarlarınızdan yönetebilirsiniz.</p>

<h3>Haklarınız</h3>
<p>KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
<ul>
<li>Kişisel verilerinizin işlenmesine ilişkin bilgi talep etme</li>
<li>Verilerinizin düzeltilmesini veya silinmesini isteme</li>
<li>Verilerinizin üçüncü taraflara aktarılmasına itiraz etme</li>
<li>Verilerinizin taşınabilirliğini talep etme</li>
</ul>

<h3>İletişim</h3>
<p>Gizlilik politikamız ile ilgili sorularınız için <strong>kvkk@kampshop.com.tr</strong> adresinden bize ulaşabilirsiniz.</p>

<p><em>Son güncelleme: Ocak 2025</em></p>',
                    'is_active' => true,
                    'meta_title' => 'Gizlilik Politikası | KampShop',
                    'meta_description' => 'KampShop gizlilik politikası. Kişisel verilerinizin korunması hakkında detaylı bilgi. KVKK uyumlu veri işleme.',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ];

            DB::table('pages')->insert($pages);
        });
    }
}
