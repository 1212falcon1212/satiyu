'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Category } from '@/types/api';
import { storageUrl } from '@/lib/utils';

interface CategoryShowcaseSectionProps {
  title: string;
  category: Category;
  children: Category[];
  bannerImage: string | null;
}

export function CategoryShowcaseSection({
  title,
  category,
  children,
  bannerImage,
}: CategoryShowcaseSectionProps) {
  const displayChildren = children.slice(0, 6);

  return (
    <section className="py-4">
      <div className="container-main">
        <div className="rounded-lg border border-secondary-200 bg-white overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left: Banner */}
            <Link
              href={`/kategori/${category.slug}`}
              className="group relative lg:col-span-5 min-h-[300px] lg:min-h-[420px]"
            >
              {bannerImage ? (
                <Image
                  src={storageUrl(bannerImage)}
                  alt={title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
                  <div className="text-center p-8">
                    <h3 className="text-2xl font-bold text-secondary-800">{category.name}</h3>
                    <span className="mt-3 inline-block rounded bg-accent px-5 py-2 text-sm font-semibold text-white">
                      Alışverişe Başla
                    </span>
                  </div>
                </div>
              )}
            </Link>

            {/* Right: Sub-category grid 3x2 */}
            <div className="lg:col-span-7">
              <div className="grid grid-cols-2 sm:grid-cols-3 h-full">
                {displayChildren.map((child, i) => (
                  <Link
                    key={child.id}
                    href={`/kategori/${child.slug}`}
                    className={`group relative overflow-hidden border-b border-r border-secondary-100 ${
                      (i + 1) % 3 === 0 ? 'sm:border-r-0' : ''
                    } ${
                      i >= displayChildren.length - 3 ? 'sm:border-b-0' : ''
                    }`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden">
                      {child.imageUrl ? (
                        <Image
                          src={storageUrl(child.imageUrl)}
                          alt={child.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-secondary-50">
                          <span className="text-2xl font-bold text-secondary-300">
                            {child.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="py-2 text-center">
                      <span className="text-sm font-medium text-secondary-700 group-hover:text-accent transition-colors">
                        {child.name} &gt;
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
