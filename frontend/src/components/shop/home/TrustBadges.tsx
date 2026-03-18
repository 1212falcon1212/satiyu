'use client';

import type { TrustBadge } from '@/types/api';
import { trustBadgeIconMap } from '@/lib/trust-badge-icons';
import { ShieldCheck } from 'lucide-react';

interface TrustBadgesProps {
  badges: TrustBadge[];
}

export function TrustBadges({ badges }: TrustBadgesProps) {
  if (badges.length === 0) return null;

  return (
    <section className="bg-secondary-50 py-6">
      <div className="container-main">
        <h2 className="text-center text-base font-bold text-secondary-900 mb-4">
          Neden Bizi Tercih Etmelisiniz?
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4 xl:flex xl:justify-around">
          {badges.map((badge) => {
            const Icon = trustBadgeIconMap[badge.icon] || ShieldCheck;

            return (
              <div
                key={badge.id}
                className="flex items-center gap-3 rounded-lg bg-white border border-secondary-100 px-4 py-3 xl:px-5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 flex-shrink-0">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-secondary-900 leading-tight">
                    {badge.title}
                  </h3>
                  {badge.description && (
                    <p className="mt-0.5 text-[10px] text-secondary-500 leading-tight line-clamp-2">
                      {badge.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
