import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası',
  description: 'Giyim Mağazası gizlilik politikası. Kişisel verilerinizin nasıl toplandığı, kullanıldığı ve korunduğu hakkında bilgi.',
};

export default function GizlilikPolitikasiPage() {
  return (
    <div className="container-main py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-secondary-900">Gizlilik Politikası</h1>
        <p className="mt-2 text-sm text-secondary-500">Son güncelleme: 1 Ocak 2024</p>

        <div className="mt-8 space-y-8 text-secondary-700 leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">Genel Bakış</h2>
            <p className="mt-2">
              Giyim Mağazası olarak kişisel verilerinizin güvenliğini ciddiye alıyoruz. Bu gizlilik
              politikası, web sitemizi kullanırken toplanan kişisel bilgilerin nasıl işlendiği,
              saklandığı ve korunduğunu açıklar. 6698 sayılı Kişisel Verilerin Korunması Kanunu
              (KVKK) kapsamında veri sorumlusu olarak hareket etmekteyiz.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">Toplanan Veriler</h2>
            <p className="mt-2">Aşağıdaki kişisel verileri toplayabiliriz:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Ad, soyad ve iletişim bilgileri (e-posta, telefon)</li>
              <li>Teslimat ve fatura adresi bilgileri</li>
              <li>Sipariş geçmişi ve alışveriş tercihleri</li>
              <li>IP adresi, tarayıcı bilgisi ve çerez verileri</li>
              <li>Müşteri hizmetleri iletişim kayıtları</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">Verilerin Kullanım Amaçları</h2>
            <p className="mt-2">Kişisel verileriniz aşağıdaki amaçlarla kullanılmaktadır:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Sipariş işlemlerinin gerçekleştirilmesi ve teslimat</li>
              <li>Müşteri hizmetleri desteği sağlanması</li>
              <li>Kampanya, fırsat ve bilgilendirme mesajlarının iletilmesi (onayınızla)</li>
              <li>Web sitesi deneyiminin iyileştirilmesi</li>
              <li>Yasal yükümlülüklerin yerine getirilmesi</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">Çerezler (Cookies)</h2>
            <p className="mt-2">
              Web sitemiz, kullanıcı deneyimini iyileştirmek için çerezler kullanmaktadır.
              Çerezler, tarayıcınız tarafından cihazınızda saklanan küçük metin dosyalarıdır.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Zorunlu çerezler:</strong> Sitenin düzgün çalışması için gereklidir (sepet, oturum bilgisi).</li>
              <li><strong>Analitik çerezler:</strong> Ziyaretçi istatistiklerini toplamak için kullanılır.</li>
              <li><strong>Pazarlama çerezleri:</strong> Kişiselleştirilmiş reklam gösterimi için kullanılır.</li>
            </ul>
            <p className="mt-2">
              Tarayıcı ayarlarınızdan çerezleri devre dışı bırakabilirsiniz. Ancak bu durumda
              sitenin bazı özellikleri düzgün çalışmayabilir.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">Veri Paylaşımı</h2>
            <p className="mt-2">
              Kişisel verileriniz, aşağıdaki durumlar dışında üçüncü taraflarla paylaşılmaz:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Kargo ve lojistik şirketleri (teslimat için gerekli bilgiler)</li>
              <li>Ödeme altyapı sağlayıcıları (güvenli ödeme işlemi için)</li>
              <li>Yasal zorunluluklar gereği yetkili kurumlara</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">Haklarınız (KVKK Kapsamında)</h2>
            <p className="mt-2">6698 sayılı KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
              <li>İşlenmişse bilgi talep etme</li>
              <li>İşleme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
              <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
              <li>Silinmesini veya yok edilmesini isteme</li>
              <li>İşlemlerin üçüncü kişilere bildirilmesini isteme</li>
              <li>Otomatik sistemlerle analiz edilmesi sonucu aleyhine çıkan sonuca itiraz etme</li>
              <li>Hukuka aykırı işleme nedeniyle zararın giderilmesini talep etme</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">İletişim</h2>
            <p className="mt-2">
              Gizlilik politikamız hakkında sorularınız için{' '}
              <a href="mailto:info@example.com" className="text-accent-600 hover:underline">info@example.com</a>{' '}
              adresine e-posta gönderebilirsiniz.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
