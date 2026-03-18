import Image from 'next/image';
import Link from 'next/link';
import { Tent, Mountain } from 'lucide-react';
import type { Banner } from '@/types/api';
import { storageUrl } from '@/lib/utils';

interface DualBannerProps {
  banners: Banner[];
}

const fallbackBanners = [
  {
    title: 'Kış Kampına Hazır mısın?',
    subtitle: 'Kış kampında ihtiyacın olan her şey burada',
    icon: Tent,
    gradient: 'from-primary-800 via-primary-700 to-secondary-800',
    href: '/arama?q=kis+kamp',
  },
  {
    title: 'Yeni Sezon Ürünleri',
    subtitle: 'Trekking ve outdoor ekipmanlarında yeni gelenler',
    icon: Mountain,
    gradient: 'from-accent-700 via-accent-600 to-secondary-800',
    href: '/arama?sort=newest',
  },
];

export function DualBanner({ banners }: DualBannerProps) {
  if (banners.length >= 2) {
    return (
      <section className="container-main py-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {banners.slice(0, 2).map((banner) => (
            <Link
              key={banner.id}
              href={banner.linkUrl || '#'}
              className="group relative block overflow-hidden rounded-xl aspect-[2/1]"
            >
              <Image
                src={storageUrl(banner.imageUrl)}
                alt={banner.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="font-display text-lg font-bold text-white lg:text-xl">
                  {banner.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="container-main py-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fallbackBanners.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className={`group relative block overflow-hidden rounded-xl bg-gradient-to-br ${item.gradient} bg-grain p-8 aspect-[2/1] flex flex-col justify-end`}
          >
            <item.icon className="absolute right-6 top-6 h-16 w-16 text-white/10" />
            <h3 className="font-display text-lg font-bold text-white lg:text-xl">
              {item.title}
            </h3>
            <p className="mt-1 text-sm text-white/70">
              {item.subtitle}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
