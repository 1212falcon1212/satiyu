'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';

interface Props {
  price: number;
}

const BRANDS = [
  { key: 'axess', label: 'Axess', logo: '/images/banks/axess.png' },
  { key: 'world', label: 'World', logo: '/images/banks/world.png' },
  { key: 'maximum', label: 'Maximum', logo: '/images/banks/maximum.png' },
  { key: 'bonus', label: 'Bonus', logo: '/images/banks/bonus.png' },
  { key: 'cardfinans', label: 'CardFinans', logo: '/images/banks/cardfinans.png' },
  { key: 'paraf', label: 'Paraf', logo: '/images/banks/paraf.png' },
  { key: 'advantage', label: 'Advantage', logo: '/images/banks/advantage.png' },
];

const INSTALLMENT_COUNTS = [1, 2, 3, 4, 5, 6];

function BankLogo({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return <span className="text-xs font-semibold text-secondary-600">{alt}</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-contain"
      onError={() => setError(true)}
    />
  );
}

export function InstallmentTable({ price }: Props) {
  const [hasBrands, setHasBrands] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await api.get('/paytr/installments');
        if (!data.installment_rates || Object.keys(data.installment_rates).length === 0) {
          setHasBrands(false);
        }
      } catch {
        setHasBrands(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        <span className="ml-2 text-sm text-secondary-500">Taksit bilgileri yükleniyor...</span>
      </div>
    );
  }

  if (!hasBrands) {
    return <p className="text-sm text-secondary-500 py-4">Taksit bilgisi bulunmuyor.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-secondary-500">
        Peşin fiyatına 6 taksit imkanı! Tüm kartlara vade farksız taksit seçenekleri aşağıda listelenmiştir.
      </p>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-secondary-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary-50">
              <th className="px-4 py-3 text-left font-semibold text-secondary-700">Taksit</th>
              {BRANDS.map((b) => (
                <th key={b.key} className="px-3 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-8 w-16 flex items-center justify-center">
                      <BankLogo src={b.logo} alt={b.label} />
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INSTALLMENT_COUNTS.map((count, i) => {
              const monthly = price / count;
              return (
                <tr key={count} className={i % 2 === 0 ? 'bg-white' : 'bg-secondary-50/50'}>
                  <td className="px-4 py-3 font-medium text-secondary-700 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {count === 1 ? 'Peşin' : `${count} Taksit`}
                      {count > 1 && (
                        <span className="inline-flex rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                          Vade Farksız
                        </span>
                      )}
                    </div>
                  </td>
                  {BRANDS.map((b) => (
                    <td key={b.key} className="px-3 py-3 text-center whitespace-nowrap">
                      <span className="font-semibold text-secondary-900">{formatPrice(monthly)}</span>
                      {count > 1 && (
                        <div className="text-[10px] text-green-600 font-medium">
                          Toplam: {formatPrice(price)}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: card layout */}
      <div className="md:hidden space-y-4">
        {BRANDS.map((b) => (
          <div key={b.key} className="rounded-xl border border-secondary-200 overflow-hidden">
            <div className="flex items-center gap-3 bg-secondary-50 px-4 py-3">
              <div className="h-7 w-14 shrink-0 flex items-center">
                <BankLogo src={b.logo} alt={b.label} />
              </div>
              <span className="text-sm font-semibold text-secondary-800">{b.label}</span>
            </div>
            <div className="divide-y divide-secondary-100">
              {INSTALLMENT_COUNTS.map((count) => {
                const monthly = price / count;
                return (
                  <div key={count} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-secondary-700">
                        {count === 1 ? 'Peşin' : `${count} Taksit`}
                      </span>
                      {count > 1 && (
                        <span className="inline-flex rounded bg-green-100 px-1 py-0.5 text-[9px] font-bold text-green-700">
                          Vade Farksız
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-secondary-900">{formatPrice(monthly)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
