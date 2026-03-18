import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'İade Politikası',
  description: 'Giyim Mağazası iade ve değişim koşulları. 14 gün içerisinde ücretsiz iade hakkı.',
};

export default function IadePolitikasiPage() {
  return (
    <div className="container-main py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-secondary-900">İade Politikası</h1>
        <p className="mt-2 text-sm text-secondary-500">Son güncelleme: 1 Ocak 2024</p>

        <div className="mt-8 space-y-8 text-secondary-700 leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">14 Gün İade Hakkı</h2>
            <p className="mt-2">
              Giyim Mağazası&apos;ndan satın aldığınız tüm ürünleri, teslim tarihinden itibaren 14 gün
              içerisinde herhangi bir gerekçe göstermeksizin iade edebilirsiniz. İade sürecinde
              kargo ücreti tarafımızca karşılanır.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">İade Koşulları</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Ürün, orijinal ambalajında ve etiketleri sökülmemiş olmalıdır.</li>
              <li>Ürün kullanılmamış, yıkanmamış ve hasar görmemiş olmalıdır.</li>
              <li>Ürünle birlikte gelen tüm aksesuarlar (kılavuz, garanti belgesi vb.) iade edilmelidir.</li>
              <li>Kişisel hijyen ürünleri (iç giyim vb.) iade kapsamı dışındadır.</li>
              <li>İade faturası veya sipariş numarası gerekmektedir.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">İade Süreci</h2>
            <div className="mt-4 space-y-4">
              <div className="flex gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">1</div>
                <div>
                  <h3 className="font-medium text-secondary-900">İade Talebi Oluşturun</h3>
                  <p className="mt-0.5 text-sm">Hesabınızdan veya müşteri hizmetlerimizi arayarak iade talebi oluşturun.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">2</div>
                <div>
                  <h3 className="font-medium text-secondary-900">Ürünü Paketleyin</h3>
                  <p className="mt-0.5 text-sm">Ürünü orijinal ambalajında, tüm aksesuarlarıyla birlikte güvenli bir şekilde paketleyin.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">3</div>
                <div>
                  <h3 className="font-medium text-secondary-900">Kargoya Verin</h3>
                  <p className="mt-0.5 text-sm">Tarafımızca oluşturulan kargo kodu ile en yakın kargo şubesinden gönderim yapın.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">4</div>
                <div>
                  <h3 className="font-medium text-secondary-900">İade Tutarını Alın</h3>
                  <p className="mt-0.5 text-sm">Ürün elimize ulaştıktan sonra 3 iş günü içerisinde iade tutarı hesabınıza yansır.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">Değişim</h2>
            <p className="mt-2">
              Beden veya renk değişikliği için de aynı iade süreci geçerlidir. Değişim talebinizi
              iade formu üzerinden iletebilirsiniz. Yeni ürün, iade ürünün elimize ulaşması ve
              kontrol edilmesinin ardından kargolanır.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-secondary-900">İletişim</h2>
            <p className="mt-2">
              İade ve değişim işlemleriniz hakkında sorularınız için{' '}
              <a href="mailto:info@example.com" className="text-accent-600 hover:underline">info@example.com</a>{' '}
              adresine e-posta gönderebilir veya{' '}
              <a href="tel:+905551234567" className="text-accent-600 hover:underline">+90 555 123 4567</a>{' '}
              numarasını arayabilirsiniz.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
