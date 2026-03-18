import type { Metadata } from 'next';
import { Shirt, Heart, Shield, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Hakkımızda',
  description: 'Giyim Mağazası hakkında bilgi edinin. Misyonumuz, değerlerimiz ve hikayemiz.',
};

const values = [
  { icon: Shirt, title: 'Tutku', desc: 'Moda ve giyime olan tutkumuz, sunulan her üründe kendini gösterir.' },
  { icon: Shield, title: 'Güven', desc: 'Sadece kalitesi kanıtlanmış ürünleri satarız. Güveniniz bizim için her şeydir.' },
  { icon: Heart, title: 'Müşteri Odaklılık', desc: 'Her müşterimiz bizim için değerlidir. Alışveriş öncesinden sonrasına kadar yanınızdayız.' },
  { icon: Users, title: 'Topluluk', desc: 'Tarzını arayan herkese ilham vermek istiyoruz. Moda dünyasında birlikte yol alıyoruz.' },
];

export default function HakkimizdaPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-900 bg-grain">
        <div className="container-main relative z-10 py-16 text-center text-white lg:py-24">
          <h1 className="font-display text-3xl font-bold lg:text-5xl">Hakkımızda</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-200">
            Modaya olan tutkumuz, sizi en iyi giyim ürünleriyle buluşturma motivasyonumuz.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="container-main py-12 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl font-bold text-secondary-900">Misyonumuz</h2>
          <p className="mt-4 text-secondary-600 leading-relaxed">
            Giyim Mağazası olarak misyonumuz, moda tutkunlarını dünyanın en kaliteli
            giyim ürünleriyle buluşturmaktır. 2020 yılında İstanbul&apos;da kurulan firmamız, kısa
            sürede Türkiye&apos;nin önde gelen online giyim platformlarından biri haline geldi.
          </p>
          <p className="mt-4 text-secondary-600 leading-relaxed">
            Dünyanın öncü moda markalarının Türkiye distribütörlüğü ve yetkili satıcılığını
            yapıyoruz. Her ürünü özenle seçiyor ve müşterilerimize en uygun fiyatla
            sunuyoruz.
          </p>
        </div>
      </section>

      {/* Why Keskin Kamp */}
      <section className="bg-white py-12 lg:py-16">
        <div className="container-main">
          <h2 className="text-center font-display text-2xl font-bold text-secondary-900">
            Neden Giyim Mağazası?
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-secondary-200/80 p-6">
              <h3 className="font-display text-lg font-semibold text-secondary-900">Geniş Ürün Yelpazesi</h3>
              <p className="mt-2 text-sm text-secondary-600">
                Günlük giyimden özel gece kıyafetlerine, ayakkabıdan aksesuara kadar ihtiyacınız olan
                her şey tek bir platformda.
              </p>
            </div>
            <div className="rounded-xl border border-secondary-200/80 p-6">
              <h3 className="font-display text-lg font-semibold text-secondary-900">Uygun Fiyat Garantisi</h3>
              <p className="mt-2 text-sm text-secondary-600">
                Doğrudan marka iş birlikleri sayesinde aracısız, en uygun fiyatları
                sunabiliyoruz.
              </p>
            </div>
            <div className="rounded-xl border border-secondary-200/80 p-6">
              <h3 className="font-display text-lg font-semibold text-secondary-900">Uzman Destek</h3>
              <p className="mt-2 text-sm text-secondary-600">
                Ekibimiz deneyimli moda uzmanlarından oluşur. Size en uygun ürünü seçmenizde
                yardımcı oluruz.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="container-main py-12 lg:py-16">
        <h2 className="text-center font-display text-2xl font-bold text-secondary-900">
          Değerlerimiz
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
                <v.icon className="h-7 w-7 text-primary-600" />
              </div>
              <h3 className="mt-3 font-display text-base font-semibold text-secondary-900">{v.title}</h3>
              <p className="mt-1 text-sm text-secondary-600">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
