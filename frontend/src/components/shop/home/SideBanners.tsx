import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Tent, Flame, Mountain } from 'lucide-react';
import type { Banner } from '@/types/api';
import { storageUrl } from '@/lib/utils';

interface SideBannersProps {
  banners: Banner[];
}

const PROMO_CARDS = [
  {
    id: 'promo-1',
    title: 'Çadır Koleksiyonu',
    icon: Tent,
    gradient: 'from-primary-700 to-primary-900',
    href: '/arama?q=cadir',
  },
  {
    id: 'promo-2',
    title: 'Kamp Ocakları',
    icon: Flame,
    gradient: 'from-accent-600 to-accent-800',
    href: '/arama?q=ocak',
  },
  {
    id: 'promo-3',
    title: 'Trekking Malzemeleri',
    icon: Mountain,
    gradient: 'from-secondary-700 to-secondary-900',
    href: '/arama?q=trekking',
  },
];

export function SideBanners({ banners }: SideBannersProps) {
  if (banners.length === 0) {
    return (
      <section className="grid grid-cols-1 sm:grid-cols-3">
        {PROMO_CARDS.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className={`relative flex h-[180px] sm:h-[220px] lg:h-[260px] flex-col items-center justify-center overflow-hidden bg-gradient-to-br ${card.gradient} text-white transition-all hover:brightness-110`}
          >
            <div className="relative z-10 text-center">
              <card.icon className="mx-auto h-10 w-10 mb-3 opacity-80" />
              <h3 className="font-display text-xl font-bold">{card.title}</h3>
            </div>
          </Link>
        ))}
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3">
      {banners.slice(0, 3).map((banner) => {
        const inner = (
          <>
            <Image
              src={storageUrl(banner.imageUrl)}
              alt={banner.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent transition-all group-hover:from-black/65" />

            {/* Content */}
            <div className="absolute inset-0 flex items-end p-5 sm:p-6 lg:p-8">
              <div>
                <h3 className="text-lg font-bold text-white drop-shadow-lg sm:text-xl lg:text-2xl">
                  {banner.title}
                </h3>
                <div className="mt-2 flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors group-hover:text-white">
                  <span>İncele</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </>
        );

        return banner.linkUrl ? (
          <Link
            key={banner.id}
            href={banner.linkUrl}
            className="group relative h-[180px] sm:h-[220px] lg:h-[260px] overflow-hidden bg-secondary-900"
          >
            {inner}
          </Link>
        ) : (
          <div
            key={banner.id}
            className="group relative h-[180px] sm:h-[220px] lg:h-[260px] overflow-hidden bg-secondary-900"
          >
            {inner}
          </div>
        );
      })}
    </section>
  );
}
