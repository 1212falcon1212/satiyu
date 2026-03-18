import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Banner } from '@/types/api';
import { storageUrl } from '@/lib/utils';

interface BottomCtaProps {
  banner?: Banner;
}

export function BottomCta({ banner }: BottomCtaProps) {
  if (!banner) return null;

  return (
    <section className="relative h-[240px] sm:h-[300px] lg:h-[360px] overflow-hidden">
      <Image
        src={storageUrl(banner.imageUrl)}
        alt={banner.title}
        fill
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            {banner.title}
          </h2>
          {banner.linkUrl && (
            <Link
              href={banner.linkUrl}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-secondary-900 shadow-xl transition-all hover:bg-primary-50 sm:text-base"
            >
              Keşfet
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
