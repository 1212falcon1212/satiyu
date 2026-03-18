import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Çerez Politikası',
  description: 'Giyim Mağazası çerez politikası. Web sitemizde kullanılan çerezler hakkında bilgi.',
};

export default function CerezPolitikasiPage() {
  return (
    <div className="container-main py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-secondary-900">Çerez Politikası</h1>
        <p className="mt-2 text-sm text-secondary-500">Son güncelleme: 1 Ocak 2024</p>

        <div className="mt-8 space-y-8 text-secondary-700 leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">Çerez Nedir?</h2>
            <p className="mt-2">
              Çerezler (cookies), web sitemizi ziyaret ettiğinizde tarayıcınız aracılığıyla
              cihazınıza depolanan küçük metin dosyalarıdır. Bu dosyalar, web sitesinin düzgün
              çalışmasını sağlamak, güvenliği artırmak, kullanıcı deneyimini geliştirmek ve siteyi
              analiz etmek amacıyla kullanılmaktadır.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">Kullandığımız Çerez Türleri</h2>

            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-semibold text-secondary-900">Zorunlu Çerezler</h3>
                <p className="mt-1">
                  Bu çerezler web sitesinin temel işlevlerinin çalışması için gereklidir.
                  Oturum yönetimi, sepet bilgileri ve güvenlik işlemleri için kullanılır.
                  Bu çerezler olmadan site düzgün çalışamaz.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-secondary-900">Performans ve Analitik Çerezleri</h3>
                <p className="mt-1">
                  Ziyaretçilerin web sitesini nasıl kullandığını anlamamıza yardımcı olur.
                  Sayfa görüntüleme sayısı, ziyaretçi kaynakları ve site içi gezinme bilgileri
                  bu çerezler aracılığıyla anonim olarak toplanır.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-secondary-900">İşlevsellik Çerezleri</h3>
                <p className="mt-1">
                  Dil tercihi, bölge seçimi ve kişiselleştirilmiş ayarlar gibi seçimlerinizi
                  hatırlamak için kullanılır. Bu çerezler size daha kişisel bir deneyim sunar.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-secondary-900">Pazarlama Çerezleri</h3>
                <p className="mt-1">
                  İlgi alanlarınıza uygun reklamlar göstermek amacıyla kullanılır. Ayrıca bir
                  reklamın kaç kez görüntülendiğini sınırlandırmak ve reklam kampanyalarının
                  etkinliğini ölçmek için de kullanılabilir.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">Üçüncü Taraf Çerezleri</h2>
            <p className="mt-2">
              Web sitemizde aşağıdaki üçüncü taraf hizmet sağlayıcılarının çerezleri kullanılabilir:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Google Analytics:</strong> Site trafiği ve kullanıcı davranışı analizi</li>
              <li><strong>Google Ads:</strong> Reklam performansı ölçümü</li>
              <li><strong>Facebook Pixel:</strong> Sosyal medya reklam optimizasyonu</li>
              <li><strong>Ödeme altyapı sağlayıcıları:</strong> Güvenli ödeme işlemleri</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">Çerezleri Yönetme</h2>
            <p className="mt-2">
              Tarayıcı ayarlarınızı değiştirerek çerezleri kontrol edebilir veya silebilirsiniz.
              Çoğu tarayıcı varsayılan olarak çerezleri kabul eder, ancak bu ayarı değiştirebilirsiniz.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Tüm çerezleri engelleyebilirsiniz</li>
              <li>Yalnızca üçüncü taraf çerezlerini engelleyebilirsiniz</li>
              <li>Mevcut çerezleri silebilirsiniz</li>
              <li>Her oturum kapandığında çerezlerin silinmesini sağlayabilirsiniz</li>
            </ul>
            <p className="mt-2">
              Çerezleri devre dışı bırakmanız durumunda web sitemizin bazı özellikleri
              düzgün çalışmayabilir.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">İletişim</h2>
            <p className="mt-2">
              Çerez politikamız hakkında sorularınız için{' '}
              <a href="mailto:info@example.com" className="text-accent-600 hover:underline">info@example.com</a>{' '}
              adresine e-posta gönderebilirsiniz.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
