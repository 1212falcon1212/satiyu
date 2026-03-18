'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Banner, Category } from '@/types/api';
import { storageUrl } from '@/lib/utils';

interface HeroBannerProps {
  banners: Banner[];
  categories: Category[];
}

export function HeroBanner({ banners }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const next = useCallback(() => {
    if (isTransitioning || banners.length <= 1) return;
    setIsTransitioning(true);
    setCurrent((c) => (c + 1) % banners.length);
    setTimeout(() => setIsTransitioning(false), 700);
  }, [banners.length, isTransitioning]);

  const prev = useCallback(() => {
    if (isTransitioning || banners.length <= 1) return;
    setIsTransitioning(true);
    setCurrent((c) => (c - 1 + banners.length) % banners.length);
    setTimeout(() => setIsTransitioning(false), 700);
  }, [banners.length, isTransitioning]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, banners.length]);

  if (banners.length === 0) {
    return (
      <section className="container-main py-3">
        <div className="flex h-[220px] sm:h-[280px] lg:h-[360px] items-center justify-center bg-secondary-100">
          <p className="text-xl font-bold text-secondary-400">Banner Ekleyin</p>
        </div>
      </section>
    );
  }

  return (
    <section className="container-main py-2">
      <div className="relative overflow-hidden">
        {/* Contained slider */}
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {banners.map((banner, i) => {
            const content = (
              <div className="relative w-full flex-shrink-0 h-[220px] sm:h-[280px] lg:h-[360px]">
                <Image
                  src={storageUrl(banner.imageUrl)}
                  alt={banner.title || ''}
                  fill
                  className="object-cover object-center"
                  priority={i === 0}
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  unoptimized
                />
                {banner.title && (
                  <div className="absolute inset-0 flex items-end">
                    <div className="w-full bg-gradient-to-t from-black/50 via-black/10 to-transparent p-6 sm:p-8 lg:p-10">
                      {banner.subtitle && (
                        <p
                          className="text-xs font-semibold uppercase tracking-widest sm:text-sm"
                          style={{ color: banner.subtitleColor || '#FFFFFF' }}
                        >
                          {banner.subtitle}
                        </p>
                      )}
                      <h2
                        className="mt-1 text-xl font-bold sm:text-2xl lg:text-3xl"
                        style={{ color: banner.titleColor || '#FFFFFF' }}
                      >
                        {banner.title}
                      </h2>
                      {banner.linkUrl && banner.buttonText && (
                        <span
                          className="mt-3 inline-block rounded bg-white/20 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold uppercase tracking-wider sm:text-sm hover:bg-white/30 transition-colors"
                          style={{ color: banner.buttonColor || '#FFFFFF' }}
                        >
                          {banner.buttonText}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );

            return banner.linkUrl ? (
              <Link key={banner.id} href={banner.linkUrl} className="block w-full flex-shrink-0">
                {content}
              </Link>
            ) : (
              <div key={banner.id} className="w-full flex-shrink-0">
                {content}
              </div>
            );
          })}
        </div>

        {/* Nav arrows */}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm transition-all hover:bg-black/40"
              aria-label="Önceki"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm transition-all hover:bg-black/40"
              aria-label="Sonraki"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { if (!isTransitioning) { setIsTransitioning(true); setCurrent(i); setTimeout(() => setIsTransitioning(false), 700); } }}
                className={`h-2.5 rounded-full transition-all ${
                  i === current ? 'w-6 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
