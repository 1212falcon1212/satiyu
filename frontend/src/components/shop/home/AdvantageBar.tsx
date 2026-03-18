'use client';

import { Truck, BadgeCheck, Headphones, RotateCcw } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

interface AdvantageItem {
  icon: string;
  text: string;
}

interface AdvantageBarProps {
  items?: AdvantageItem[];
}

const iconMap: Record<string, React.ElementType> = {
  truck: Truck,
  badge: BadgeCheck,
  headphones: Headphones,
  rotate: RotateCcw,
};

export function AdvantageBar({ items }: AdvantageBarProps) {
  const settings = useSettings();
  const freeShippingLimit = settings.shipping?.free_shipping_limit ?? '500';

  if (items && items.length > 0) {
    return (
      <section className="bg-secondary-800 text-white">
        <div className="container-main">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-around py-2">
            {items.map((item, i) => {
              const Icon = iconMap[item.icon] || BadgeCheck;
              return (
                <div key={i} className="flex items-center justify-center gap-2 py-2 sm:py-2.5">
                  <Icon className="h-4 w-4 text-accent flex-shrink-0" />
                  <p
                    className="text-[11px] font-medium sm:text-xs"
                    dangerouslySetInnerHTML={{ __html: item.text }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-secondary-800 text-white">
      <div className="container-main">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-around py-2">
          <div className="flex items-center justify-center gap-2 py-2 sm:py-2.5">
            <Truck className="h-4 w-4 text-accent flex-shrink-0" />
            <p className="text-[11px] font-medium sm:text-xs">
              {freeShippingLimit} TL üzeri <span className="font-bold">Kargo Ücretsiz</span>
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 py-2 sm:py-2.5">
            <BadgeCheck className="h-4 w-4 text-accent flex-shrink-0" />
            <p className="text-[11px] font-medium sm:text-xs">
              <span className="font-bold">Orijinal Ürün</span> Garantisi
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 py-2 sm:py-2.5">
            <RotateCcw className="h-4 w-4 text-accent flex-shrink-0" />
            <p className="text-[11px] font-medium sm:text-xs">
              <span className="font-bold">Kolay İade</span> Garantisi
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 py-2 sm:py-2.5">
            <Headphones className="h-4 w-4 text-accent flex-shrink-0" />
            <p className="text-[11px] font-medium sm:text-xs">
              <span className="font-bold">7/24</span> Müşteri Desteği
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
