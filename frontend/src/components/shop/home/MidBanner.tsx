import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Banner } from '@/types/api';
import { storageUrl } from '@/lib/utils';

interface MidBannerProps {
  banner?: Banner;
}

export function MidBanner({ banner }: MidBannerProps) {
  const href = banner?.linkUrl || '/tum-urunler';

  return (
    <section className="relative h-[200px] sm:h-[260px] lg:h-[320px] overflow-hidden">
      {banner ? (
        <>
          <Image
            src={storageUrl(banner.imageUrl)}
            alt={banner.title}
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
                {banner.title}
              </h2>
              <Link
                href={href}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-sm border border-white/20 transition-colors hover:bg-white/20"
              >
                Keşfet <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-r from-primary-800 via-primary-700 to-primary-900">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
                Macera Seni Bekliyor
              </h2>
              <p className="mt-2 text-primary-200">
                En kaliteli kamp ve outdoor ekipmanlarını keşfet
              </p>
              <Link
                href="/tum-urunler"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-sm border border-white/20 transition-colors hover:bg-white/20"
              >
                Keşfet <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
