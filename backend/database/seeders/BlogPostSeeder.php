<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BlogPostSeeder extends Seeder
{
    public function run(): void
    {
        $posts = [
            [
                'title' => '2025 İlkbahar/Yaz Moda Trendleri',
                'slug' => '2025-ilkbahar-yaz-moda-trendleri',
                'excerpt' => 'Bu sezonun en dikkat çekici moda trendlerini sizler için derledik. Pastel tonlar, oversize kesimler ve sürdürülebilir moda ön plana çıkıyor.',
                'content' => '<p>2025 ilkbahar/yaz sezonu, moda dünyasında heyecan verici yeniliklerle geliyor. Bu sezonun en öne çıkan trendlerini sizler için derledik.</p><h2>1. Pastel Tonlar</h2><p>Lavanta, açık mavi, pudra pembe ve mint yeşili bu sezonun vazgeçilmez renkleri. Pastel tonlar hem günlük hem de özel günlerde rahatlıkla kombinlenebilir.</p><h2>2. Oversize Kesimler</h2><p>Rahat ve şık oversize kesimler bu sezon da popülerliğini koruyor. Özellikle blazer ceketler ve geniş paça pantolonlar trend listesinin başında yer alıyor.</p><h2>3. Sürdürülebilir Moda</h2><p>Çevre dostu malzemeler ve etik üretim bu sezonun en önemli konularından biri. Organik pamuk, geri dönüştürülmüş kumaşlar ve yerel üretim ön planda.</p><h2>4. Retro Detaylar</h2><p>70\'ler ve 90\'lardan ilham alan retro detaylar gardıroplara geri dönüyor. Yüksek bel pantolonlar, geniş yakalı gömlekler ve platform ayakkabılar bu sezonun favori parçaları.</p>',
                'featured_image' => 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&h=600&fit=crop&q=80',
                'author' => 'Moda Editörü',
                'is_active' => true,
                'meta_title' => '2025 İlkbahar/Yaz Moda Trendleri',
                'meta_description' => 'Bu sezonun en dikkat çekici moda trendlerini keşfedin.',
                'published_at' => now()->subDays(2),
                'created_at' => now()->subDays(2),
                'updated_at' => now()->subDays(2),
            ],
            [
                'title' => 'Doğru Beden Nasıl Seçilir?',
                'slug' => 'dogru-beden-nasil-secilir',
                'excerpt' => 'Online alışverişte en büyük sorunlardan biri doğru bedeni bulmak. Bu rehberimizde size yardımcı olacak ipuçları paylaşıyoruz.',
                'content' => '<p>Online alışverişte en sık karşılaşılan sorunlardan biri yanlış beden seçimi. Doğru ölçü almanın ve beden tablosunu okumanın püf noktalarını sizlerle paylaşıyoruz.</p><h2>Ölçülerinizi Doğru Alın</h2><p>Göğüs, bel ve kalça ölçülerinizi düzenli aralıklarla güncelleyin. Ölçü alırken dar olmayan bir mezura kullanın ve vücudunuzu sıkmadan ölçün.</p><h2>Beden Tablosunu İnceleyin</h2><p>Her marka farklı kalıplar kullanır. Satın almadan önce markanın beden tablosunu mutlaka kontrol edin. Ölçülerinizi tablodaki değerlerle karşılaştırın.</p><h2>Kumaş Türüne Dikkat Edin</h2><p>Esnek kumaşlarda normal bedeninizi, sert kumaşlarda bir beden büyük tercih edebilirsiniz. Ürün açıklamasındaki kumaş bilgisini mutlaka okuyun.</p><h2>Yorumları Okuyun</h2><p>Diğer müşterilerin beden yorumları size yol gösterebilir. "Kalıbı büyük çıkıyor" veya "dar kalıp" gibi notlara dikkat edin.</p>',
                'featured_image' => 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&h=600&fit=crop&q=80',
                'author' => 'Stil Danışmanı',
                'is_active' => true,
                'meta_title' => 'Online Alışverişte Doğru Beden Seçimi Rehberi',
                'meta_description' => 'Online alışverişte doğru bedeni seçmenin ipuçları.',
                'published_at' => now()->subDays(5),
                'created_at' => now()->subDays(5),
                'updated_at' => now()->subDays(5),
            ],
            [
                'title' => 'Kapsül Gardırop Rehberi',
                'slug' => 'kapsul-gardirop-rehberi',
                'excerpt' => 'Az parçayla çok kombinasyon! Kapsül gardırop oluşturmanın temel kurallarını ve olmazsa olmaz parçaları keşfedin.',
                'content' => '<p>Kapsül gardırop, az ama öz parçalarla sayısız kombinasyon oluşturmanın sanatıdır. Hem bütçe dostu hem de çevre dostu bu yaklaşım son yılların en popüler moda trendlerinden biri.</p><h2>Temel Parçalar</h2><p>Beyaz t-shirt, siyah pantolon, denim jean, blazer ceket ve küçük siyah elbise kapsül gardırobun olmazsa olmaz parçalarıdır.</p><h2>Renk Paleti</h2><p>Nötr tonlar (siyah, beyaz, lacivert, bej) temel oluştururken, 2-3 aksesuar rengiyle gardırobunuza kişilik katabilirsiniz.</p><h2>Kalite Önemli</h2><p>Az parça alacağınız için kaliteli kumaşlara yatırım yapın. İyi dikilmiş, kaliteli bir parça yıllarca dayanır ve her zaman şık görünür.</p>',
                'featured_image' => 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1200&h=600&fit=crop&q=80',
                'author' => 'Moda Editörü',
                'is_active' => true,
                'meta_title' => 'Kapsül Gardırop Nasıl Oluşturulur?',
                'meta_description' => 'Az parçayla çok kombinasyon: Kapsül gardırop rehberi.',
                'published_at' => now()->subDays(8),
                'created_at' => now()->subDays(8),
                'updated_at' => now()->subDays(8),
            ],
            [
                'title' => 'Düğün Sezonu İçin Kombin Önerileri',
                'slug' => 'dugun-sezonu-kombin-onerileri',
                'excerpt' => 'Düğün davetiyesi mi aldınız? Ne giyeceğinize karar veremiyorsanız, bu kombin önerilerimize göz atın.',
                'content' => '<p>Düğün sezonu yaklaşırken "ne giysem" sorusu herkesin aklını meşgul ediyor. Kadın ve erkekler için düğün kombinleri önerilerimizi sizler için hazırladık.</p><h2>Kadınlar İçin</h2><p>Midi boy elbiseler düğünlerin favorisi. Saten veya şifon kumaşlar şık bir görünüm sunar. Renk seçiminde pastel tonlar veya canlı renkler tercih edebilirsiniz. Beyaz giymekten kaçının!</p><h2>Erkekler İçin</h2><p>Takım elbise her zaman güvenli bir seçim. Yazlık düğünler için keten takım elbise veya chino pantolon-blazer kombinasyonu da çok şık durur.</p><h2>Aksesuar Önerileri</h2><p>Küçük bir clutch çanta, zarif takılar ve uyumlu ayakkabılar kombinasyonunuzu tamamlar. Rahat bir ayakkabı seçmeyi unutmayın - gece boyunca dans edeceksiniz!</p>',
                'featured_image' => 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1200&h=600&fit=crop&q=80',
                'author' => 'Stil Danışmanı',
                'is_active' => true,
                'meta_title' => 'Düğün Sezonu Kombin Önerileri 2025',
                'meta_description' => 'Düğün sezonu için kadın ve erkek kombin önerileri.',
                'published_at' => now()->subDays(12),
                'created_at' => now()->subDays(12),
                'updated_at' => now()->subDays(12),
            ],
            [
                'title' => 'Giyim Bakım Rehberi: Kıyafetleriniz Daha Uzun Ömürlü Olsun',
                'slug' => 'giyim-bakim-rehberi',
                'excerpt' => 'Kıyafetlerinizin ömrünü uzatmak ve ilk günkü gibi kalmasını sağlamak için bakım ipuçları.',
                'content' => '<p>Sevdiğiniz kıyafetlerin uzun ömürlü olması için doğru bakım şart. İşte kıyafetlerinizi daha uzun süre yeni gibi tutmanın yolları.</p><h2>Yıkama Kuralları</h2><p>Etiketleri her zaman okuyun. Koyu ve açık renkleri ayrı yıkayın. Hassas kumaşları file çanta içinde yıkayın. Çamaşır makinesini aşırı doldurmayın.</p><h2>Kurutma</h2><p>Mümkünse kıyafetlerinizi asarak kurutun. Kurutma makinesi kumaşları yıpratabilir. Triko ve kazakları yatay pozisyonda kurutun ki uzamasın.</p><h2>Saklama</h2><p>Mevsimlik kıyafetleri temiz ve kuru bir yerde saklayın. Elbise ve ceketleri geniş askılara asın. Triko ürünleri katlayarak saklayın.</p><h2>Ütüleme</h2><p>Her kumaşın ütüleme sıcaklığı farklıdır. İpek ve sentetik kumaşları düşük ısıda, pamuk ve keten kumaşları yüksek ısıda ütüleyin.</p>',
                'featured_image' => 'https://images.unsplash.com/photo-1558171813-01eda03f7de1?w=1200&h=600&fit=crop&q=80',
                'author' => 'Moda Editörü',
                'is_active' => true,
                'meta_title' => 'Giyim Bakım Rehberi - Kıyafet Bakım İpuçları',
                'meta_description' => 'Kıyafetlerinizin ömrünü uzatan bakım ipuçları.',
                'published_at' => now()->subDays(15),
                'created_at' => now()->subDays(15),
                'updated_at' => now()->subDays(15),
            ],
        ];

        DB::table('blog_posts')->insert($posts);
    }
}
