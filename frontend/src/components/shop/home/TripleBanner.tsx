import Image from 'next/image';
import Link from 'next/link';
import type { Banner } from '@/types/api';
import { storageUrl } from '@/lib/utils';

interface TripleBannerProps {
  banners: Banner[];
}

function BannerCard({ banner }: { banner: Banner }) {
  const content = (
    <div className="group relative h-full w-full overflow-hidden rounded-lg">
      <Image
        src={storageUrl(banner.imageUrl)}
        alt={banner.title || ''}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-110"
        sizes="(max-width: 640px) 100vw, 33vw"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      {/* Text overlay */}
      <div className="absolute inset-0 flex flex-col items-start justify-end p-5 sm:p-6">
        {banner.title && (
          <>
            {banner.subtitle && (
              <p
                className="text-[10px] font-semibold uppercase tracking-widest sm:text-xs"
                style={{ color: banner.subtitleColor || '#FFFFFF' }}
              >
                {banner.subtitle}
              </p>
            )}
            <h3
              className="mt-1 text-base font-bold sm:text-lg lg:text-xl"
              style={{ color: banner.titleColor || '#FFFFFF' }}
            >
              {banner.title}
            </h3>
            {banner.linkUrl && banner.buttonText && (
              <span
                className="mt-2 inline-block text-xs font-semibold uppercase tracking-wider border-b pb-0.5 group-hover:border-opacity-100 transition-colors"
                style={{ color: banner.buttonColor || '#FFFFFF', borderColor: `${banner.buttonColor || '#FFFFFF'}99` }}
              >
                {banner.buttonText}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );

  return banner.linkUrl ? (
    <Link href={banner.linkUrl} className="block h-full">
      {content}
    </Link>
  ) : (
    <div className="h-full">
      {content}
    </div>
  );
}

export function TripleBanner({ banners }: TripleBannerProps) {
  if (banners.length === 0) return null;

  const items = banners.slice(0, 3);

  return (
    <section className="bg-white py-3">
      <div className="container-main">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {items.map((banner) => (
            <div key={banner.id} className="h-[200px] sm:h-[260px] lg:h-[320px]">
              <BannerCard banner={banner} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
