import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MapPin, Clock, ArrowRight } from 'lucide-react';
import type { Brand, Category, SiteSettings, BlogPost } from '@/types/api';
import { FooterNewsletter } from './FooterNewsletter';

interface ShopFooterProps {
  settings: SiteSettings;
  categories: Category[];
  brands: Brand[];
  blogPosts?: BlogPost[];
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ShopFooter({ settings, categories, brands, blogPosts = [] }: ShopFooterProps) {
  const general = settings.general ?? {};

  const rootCategories = categories
    .filter((c) => c.parentId === null)
    .slice(0, 8);

  const siteName = general.site_name || 'Moda';
  const siteLogo = general.site_logo;

  const latestPosts = blogPosts.slice(0, 3);

  return (
    <footer>
      {/* Pre-footer: Blog Posts */}
      {latestPosts.length > 0 && (
        <div className="bg-secondary-50 border-t border-secondary-100">
          <div className="container-main py-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-1">Blog</p>
                <h3 className="text-xl font-bold text-secondary-900 lg:text-2xl">Son Yazılarımız</h3>
              </div>
              <Link
                href="/blog"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-secondary-700 hover:text-accent transition-colors"
              >
                Tümünü Gör <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {latestPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                  <div className="relative overflow-hidden rounded-lg aspect-[16/10] mb-3">
                    {post.featuredImage ? (
                      <Image
                        src={post.featuredImage}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, 33vw"
                        unoptimized
                      />
                    ) : (
                      <div className="h-full w-full bg-secondary-200" />
                    )}
                  </div>
                  <p className="text-[11px] text-secondary-400 mb-1">
                    {post.author} · {formatDate(post.publishedAt)}
                  </p>
                  <h4 className="text-sm font-semibold text-secondary-900 group-hover:text-accent transition-colors line-clamp-2">
                    {post.title}
                  </h4>
                </Link>
              ))}
            </div>

            <Link
              href="/blog"
              className="sm:hidden mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary-700 hover:text-accent transition-colors"
            >
              Tümünü Gör <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Main footer */}
      <div className="bg-[#333] text-secondary-300">
        <div className="container-main py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {/* Column 1: Logo + Contact */}
            <div className="lg:col-span-2">
              <div className="mb-4">
                {siteLogo ? (
                  <Image
                    src={siteLogo.startsWith('http') ? siteLogo : `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '')}${siteLogo}`}
                    alt={siteName}
                    width={160}
                    height={48}
                    className="h-10 w-auto object-contain"
                    unoptimized
                  />
                ) : (
                  <span className="text-xl font-bold text-white">{siteName}</span>
                )}
              </div>
              <ul className="space-y-2.5 text-sm">
                {general.address && (
                  <li className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                    <span>{general.address}</span>
                  </li>
                )}
                {general.site_phone && (
                  <li>
                    <a href={`tel:${general.site_phone.replace(/\s/g, '')}`} className="flex items-center gap-2.5 hover:text-white transition-colors">
                      <Phone className="h-4 w-4 text-accent flex-shrink-0" />
                      {general.site_phone}
                    </a>
                  </li>
                )}
                {general.site_email && (
                  <li>
                    <a href={`mailto:${general.site_email}`} className="flex items-center gap-2.5 hover:text-white transition-colors">
                      <Mail className="h-4 w-4 text-accent flex-shrink-0" />
                      {general.site_email}
                    </a>
                  </li>
                )}
                {general.working_hours && (
                  <li className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 text-accent flex-shrink-0" />
                    <span>{general.working_hours}</span>
                  </li>
                )}
              </ul>

              {/* Newsletter in footer */}
              <div className="mt-6">
                <FooterNewsletter />
              </div>
            </div>

            {/* Column 2: Kategoriler */}
            <div>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-white">
                Kategoriler
              </h4>
              <ul className="space-y-2 text-sm">
                {rootCategories.slice(0, 6).map((cat) => (
                  <li key={cat.id}>
                    <Link href={`/kategori/${cat.slug}`} className="hover:text-white transition-colors">
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Hesabım */}
            <div>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-white">
                Hesabım
              </h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/giris" className="hover:text-white transition-colors">Giriş Yap</Link></li>
                <li><Link href="/kayit" className="hover:text-white transition-colors">Kayıt Ol</Link></li>
                <li><Link href="/hesabim" className="hover:text-white transition-colors">Hesabım</Link></li>
                <li><Link href="/hesabim/siparislerim" className="hover:text-white transition-colors">Siparişlerim</Link></li>
                <li><Link href="/hesabim/favorilerim" className="hover:text-white transition-colors">Favorilerim</Link></li>
                <li><Link href="/sepet" className="hover:text-white transition-colors">Sepetim</Link></li>
              </ul>
            </div>

            {/* Column 4: Kurumsal */}
            <div>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-white">
                Faydalı Linkler
              </h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/hakkimizda" className="hover:text-white transition-colors">Hakkımızda</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/iletisim" className="hover:text-white transition-colors">İletişim</Link></li>
                <li><Link href="/gizlilik-politikasi" className="hover:text-white transition-colors">Gizlilik Politikası</Link></li>
                <li><Link href="/iade-politikasi" className="hover:text-white transition-colors">İade Politikası</Link></li>
                <li><Link href="/kvkk" className="hover:text-white transition-colors">KVKK Aydınlatma Metni</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10">
          <div className="container-main flex flex-col items-center justify-between gap-4 py-5 sm:flex-row sm:gap-2">
            <span className="text-sm text-secondary-400">
              &copy; {new Date().getFullYear()} {siteName}. Tüm hakları saklıdır.
            </span>
            <span className="text-sm text-secondary-500">
              Satiyu <a href="https://www.satiyu.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition-colors">E-Ticaret</a> altyapısı kullanılmaktadır.
            </span>
            <div className="flex items-center gap-3">
              <Image src="/images/payment/visa.png" alt="Visa" width={48} height={32} className="h-7 w-auto rounded bg-white/90 px-1.5 py-0.5 object-contain" unoptimized />
              <Image src="/images/payment/mastercard.png" alt="Mastercard" width={48} height={32} className="h-7 w-auto rounded bg-white/90 px-1.5 py-0.5 object-contain" unoptimized />
              <Image src="/images/payment/troy.png" alt="Troy" width={48} height={32} className="h-7 w-auto rounded bg-white/90 px-1.5 py-0.5 object-contain" unoptimized />
              <Image src="/images/payment/amex.png" alt="American Express" width={48} height={32} className="h-7 w-auto rounded bg-white/90 px-1.5 py-0.5 object-contain" unoptimized />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
