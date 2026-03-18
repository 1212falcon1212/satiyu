'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false);
  const settings = useSettings();

  const enabled = settings.general?.announcement_enabled === 'true';
  const text = settings.general?.announcement_text;
  const link = settings.general?.announcement_link;
  const bgColor = settings.general?.announcement_bg_color || '#E53E3E';

  if (!enabled || !text || dismissed) return null;

  const textEl = (
    <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{text}</span>
  );

  const marquee = (
    <div className="overflow-hidden w-full">
      <div className="animate-marquee flex w-max">
        <span className="flex items-center justify-center min-w-[100vw]">{textEl}</span>
        <span className="flex items-center justify-center min-w-[100vw]">{textEl}</span>
      </div>
    </div>
  );

  return (
    <div
      className="relative flex items-center px-10 py-2.5 text-white"
      style={{ backgroundColor: bgColor }}
    >
      {link ? (
        <Link href={link} className="block w-full hover:underline">
          {marquee}
        </Link>
      ) : (
        marquee
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/70 hover:text-white transition-colors"
        aria-label="Kapat"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
