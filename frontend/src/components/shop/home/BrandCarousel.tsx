'use client';

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Brand } from '@/types/api';

interface BrandCarouselProps {
  brands: Brand[];
}

function BrandLogo({ brand }: { brand: Brand }) {
  const [failed, setFailed] = useState(false);

  if (!brand.logoUrl || failed) {
    return (
      <span className="text-sm font-bold text-secondary-400 group-hover:text-secondary-600 transition-colors tracking-wide uppercase">
        {brand.name}
      </span>
    );
  }

  const src = brand.logoUrl.startsWith('http')
    ? brand.logoUrl
    : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${brand.logoUrl}`;

  return (
    <Image
      src={src}
      alt={brand.name}
      width={120}
      height={60}
      unoptimized
      onError={() => setFailed(true)}
      className="max-h-14 w-auto object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
    />
  );
}

export function BrandCarousel({ brands }: BrandCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const needsCarousel = brands.length > 5;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !needsCarousel) return;

    let animId: number;
    const speed = 0.5;

    function step() {
      if (!paused && el) {
        el.scrollLeft += speed;
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth) {
          el.scrollLeft = 0;
        }
      }
      animId = requestAnimationFrame(step);
    }

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [paused, needsCarousel]);

  if (brands.length === 0) return null;

  return (
    <section className="bg-white py-6">
      <div className="container-main">
        <h2 className="text-center text-base font-bold text-secondary-900 mb-4">Markalarımız</h2>

        {/* Mobile: 2-column grid */}
        <div className="grid grid-cols-2 gap-3 py-2 md:hidden">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/arama?brands=${brand.id}`}
              className="group flex aspect-square items-center justify-center bg-white p-4 border border-secondary-100 transition-all hover:border-secondary-300"
            >
              <BrandLogo brand={brand} />
            </Link>
          ))}
        </div>

        {/* Desktop: carousel or grid */}
        <div
          ref={needsCarousel ? scrollRef : undefined}
          onMouseEnter={needsCarousel ? () => setPaused(true) : undefined}
          onMouseLeave={needsCarousel ? () => setPaused(false) : undefined}
          className={needsCarousel
            ? "hidden md:flex gap-4 overflow-x-auto scrollbar-hide py-2"
            : "hidden md:grid grid-cols-5 gap-4 py-2"
          }
        >
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/arama?brands=${brand.id}`}
              className={`group flex aspect-square items-center justify-center bg-white p-5 border border-secondary-100 transition-all hover:border-secondary-300 ${needsCarousel ? 'w-[calc((100%-64px)/5)] flex-shrink-0' : ''}`}
            >
              <BrandLogo brand={brand} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
