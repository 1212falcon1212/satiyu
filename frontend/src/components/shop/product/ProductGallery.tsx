'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ImageOff, ZoomIn } from 'lucide-react';
import type { ProductImage } from '@/types/api';
import { cn } from '@/lib/utils';

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  const handleImageError = useCallback((imageId: number) => {
    setFailedImages((prev) => new Set(prev).add(imageId));
  }, []);

  const sorted = [...images].sort((a, b) => {
    if (a.isMain && !b.isMain) return -1;
    if (!a.isMain && b.isMain) return 1;
    return a.sortOrder - b.sortOrder;
  });

  const activeImage = sorted[activeIndex] || null;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }, []);

  const goTo = useCallback((dir: 'prev' | 'next') => {
    if (dir === 'next') {
      setActiveIndex((i) => (i + 1) % sorted.length);
    } else {
      setActiveIndex((i) => (i - 1 + sorted.length) % sorted.length);
    }
  }, [sorted.length]);

  if (sorted.length === 0) {
    return (
      <div className="aspect-[3/4] w-full bg-secondary-100 flex items-center justify-center text-secondary-300">
        <span className="text-sm">Görsel yok</span>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      {/* Left vertical thumbnails - WoodMart style */}
      {sorted.length > 1 && (
        <div className="hidden sm:flex flex-col items-center gap-1 w-[80px] flex-shrink-0">
          {/* Scroll up */}
          {sorted.length > 4 && (
            <button
              type="button"
              onClick={() => goTo('prev')}
              className="flex h-7 w-full items-center justify-center text-secondary-400 hover:text-secondary-700 transition-colors"
              aria-label="Önceki"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          )}

          <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto scrollbar-hide">
            {sorted.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={cn(
                  'relative w-[72px] h-[90px] flex-shrink-0 overflow-hidden border transition-all',
                  i === activeIndex
                    ? 'border-accent shadow-sm'
                    : 'border-secondary-200 hover:border-secondary-400'
                )}
              >
                {failedImages.has(img.id) ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-secondary-100">
                    <ImageOff className="h-4 w-4 text-secondary-300" />
                  </div>
                ) : (
                  <Image
                    src={img.imageUrl}
                    alt={img.altText || `${productName} ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="72px"
                    unoptimized
                    onError={() => handleImageError(img.id)}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Scroll down */}
          {sorted.length > 4 && (
            <button
              type="button"
              onClick={() => goTo('next')}
              className="flex h-7 w-full items-center justify-center text-secondary-400 hover:text-secondary-700 transition-colors"
              aria-label="Sonraki"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Main image */}
      <div className="flex-1 min-w-0">
        <div
          className="relative aspect-[4/5] w-full overflow-hidden bg-white cursor-zoom-in"
          onMouseEnter={() => setZoomed(true)}
          onMouseLeave={() => setZoomed(false)}
          onMouseMove={handleMouseMove}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            (e.currentTarget as HTMLDivElement).dataset.touchX = String(touch.clientX);
          }}
          onTouchEnd={(e) => {
            const startX = Number((e.currentTarget as HTMLDivElement).dataset.touchX || 0);
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            if (Math.abs(diff) > 50) {
              goTo(diff > 0 ? 'next' : 'prev');
            }
          }}
        >
          {activeImage && (
            failedImages.has(activeImage.id) ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-secondary-300">
                <ImageOff className="h-12 w-12" />
                <span className="mt-2 text-sm">Görsel yüklenemedi</span>
              </div>
            ) : (
              <Image
                src={activeImage.imageUrl}
                alt={activeImage.altText || productName}
                fill
                className={cn(
                  'object-contain transition-transform duration-200',
                  zoomed && 'scale-[2]'
                )}
                style={zoomed ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : undefined}
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                unoptimized
                onError={() => handleImageError(activeImage.id)}
              />
            )
          )}

          {/* Zoom icon - bottom right */}
          <button
            type="button"
            className="absolute right-3 bottom-3 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md text-secondary-600 hover:text-secondary-900 transition-colors"
            aria-label="Büyüt"
          >
            <ZoomIn className="h-5 w-5" />
          </button>

          {/* Mobile nav arrows */}
          {sorted.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => goTo('prev')}
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow text-secondary-600 hover:text-secondary-900 transition-colors sm:hidden"
                aria-label="Önceki görsel"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => goTo('next')}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow text-secondary-600 hover:text-secondary-900 transition-colors sm:hidden"
                aria-label="Sonraki görsel"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Mobile horizontal thumbnails */}
        {sorted.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-3 sm:hidden">
            {sorted.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={cn(
                  'relative h-16 w-16 flex-shrink-0 overflow-hidden border transition-colors',
                  i === activeIndex ? 'border-accent' : 'border-secondary-200'
                )}
              >
                {failedImages.has(img.id) ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-secondary-100">
                    <ImageOff className="h-4 w-4 text-secondary-300" />
                  </div>
                ) : (
                  <Image
                    src={img.imageUrl}
                    alt={img.altText || `${productName} ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                    unoptimized
                    onError={() => handleImageError(img.id)}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
