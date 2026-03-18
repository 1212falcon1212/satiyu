import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni',
  description: 'Giyim Mağazası KVKK aydınlatma metni. 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında bilgilendirme.',
};

export default function KvkkPage() {
  return (
    <div className="container-main py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-secondary-900">KVKK Aydınlatma Metni</h1>
        <p className="mt-2 text-sm text-secondary-500">Son güncelleme: 1 Ocak 2024</p>

        <div className="mt-8 space-y-8 text-secondary-700 leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">1. Veri Sorumlusu</h2>
            <p className="mt-2">
              6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, kişisel
              verileriniz veri sorumlusu olarak Giyim Mağazası tarafından aşağıda açıklanan kapsamda
              işlenebilecektir. Bu aydınlatma metni, KVKK&apos;nın 10. maddesi gereğince
              hazırlanmıştır.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">2. İşlenen Kişisel Veriler</h2>
            <p className="mt-2">Tarafınıza ait aşağıdaki kişisel veriler işlenmektedir:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Kimlik bilgileri:</strong> Ad, soyad</li>
              <li><strong>İletişim bilgileri:</strong> E-posta adresi, telefon numarası, adres</li>
              <li><strong>Müşteri işlem bilgileri:</strong> Sipariş bilgileri, ödeme bilgileri, fatura bilgileri</li>
              <li><strong>İşlem güvenliği bilgileri:</strong> IP adresi, tarayıcı bilgileri, çerez verileri</li>
              <li><strong>Pazarlama bilgileri:</strong> Alışveriş tercihleri, ilgi alanları</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">3. Kişisel Verilerin İşlenme Amaçları</h2>
            <p className="mt-2">Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Ürün ve hizmetlerin sunulması, sipariş süreçlerinin yönetimi</li>
              <li>Teslimat ve kargo işlemlerinin gerçekleştirilmesi</li>
              <li>Ödeme işlemlerinin yapılması</li>
              <li>Müşteri hizmetleri desteğinin sağlanması</li>
              <li>İade ve değişim süreçlerinin yürütülmesi</li>
              <li>Yasal yükümlülüklerin yerine getirilmesi</li>
              <li>İletişim faaliyetlerinin yürütülmesi</li>
              <li>Kampanya, promosyon ve bilgilendirme yapılması (açık rızanızla)</li>
              <li>Web sitesi kullanım analizlerinin gerçekleştirilmesi</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">4. Kişisel Verilerin Aktarılması</h2>
            <p className="mt-2">
              Kişisel verileriniz, yukarıda belirtilen amaçların gerçekleştirilmesi doğrultusunda
              aşağıdaki taraflara aktarılabilmektedir:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Kargo ve lojistik firmaları (teslimat amaçlı)</li>
              <li>Ödeme kuruluşları ve bankalar (ödeme işlemleri amaçlı)</li>
              <li>Hukuki süreçlerde yetkili kamu kurumları</li>
              <li>Bilgi teknolojileri hizmet sağlayıcıları</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">5. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi</h2>
            <p className="mt-2">
              Kişisel verileriniz, web sitemiz, mobil uygulamamız, çağrı merkezimiz ve sosyal medya
              kanallarımız aracılığıyla elektronik ortamda toplanmaktadır. Bu veriler;
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Sözleşmenin kurulması veya ifası için gerekli olması</li>
              <li>Hukuki yükümlülüklerin yerine getirilmesi</li>
              <li>Meşru menfaatlerimiz için zorunlu olması</li>
              <li>Açık rızanızın bulunması</li>
            </ul>
            <p className="mt-2">hukuki sebeplerine dayanılarak işlenmektedir.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">6. KVKK Kapsamındaki Haklarınız</h2>
            <p className="mt-2">KVKK&apos;nın 11. maddesi gereğince aşağıdaki haklara sahipsiniz:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
              <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</li>
              <li>Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
              <li>Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme</li>
              <li>Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme</li>
              <li>KVKK&apos;nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerinizin silinmesini veya yok edilmesini isteme</li>
              <li>Düzeltme, silme veya yok etme işlemlerinin kişisel verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
              <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle kişinin kendisi aleyhine bir sonucun ortaya çıkmasına itiraz etme</li>
              <li>Kişisel verilerin kanuna aykırı olarak işlenmesi sebebiyle zarara uğraması hâlinde zararın giderilmesini talep etme</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">7. Başvuru Yöntemi</h2>
            <p className="mt-2">
              Yukarıda belirtilen haklarınızı kullanmak için{' '}
              <a href="mailto:info@example.com" className="text-accent-600 hover:underline">info@example.com</a>{' '}
              adresine kimliğinizi tespit edici bilgiler ile birlikte yazılı olarak başvurabilirsiniz.
              Başvurunuz en kısa sürede ve en geç 30 gün içinde sonuçlandırılacaktır.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
