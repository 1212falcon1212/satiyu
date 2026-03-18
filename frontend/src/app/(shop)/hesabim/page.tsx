'use client';

import Link from 'next/link';
import { Package, MapPin, Heart, Settings, ChevronRight } from 'lucide-react';
import { useCustomerAuthStore } from '@/store/customer-auth';

const quickLinks = [
  {
    href: '/hesabim/siparislerim',
    icon: Package,
    iconBg: 'bg-primary-50',
    iconColor: 'text-primary-600',
    title: 'Siparişlerim',
    description: 'Sipariş geçmişinizi takip edin',
  },
  {
    href: '/hesabim/adreslerim',
    icon: MapPin,
    iconBg: 'bg-accent-50',
    iconColor: 'text-accent-600',
    title: 'Adreslerim',
    description: 'Teslimat adreslerinizi yönetin',
  },
  {
    href: '/hesabim/favorilerim',
    icon: Heart,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
    title: 'Favorilerim',
    description: 'Beğendiğiniz ürünleri görüntüleyin',
  },
  {
    href: '/hesabim/ayarlar',
    icon: Settings,
    iconBg: 'bg-secondary-50',
    iconColor: 'text-secondary-600',
    title: 'Ayarlar',
    description: 'Hesap bilgileri ve şifre',
  },
] as const;

export default function AccountPage() {
  const customer = useCustomerAuthStore((s) => s.customer);

  if (!customer) return null;

  return (
    <div>
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl border border-secondary-200 bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/80 via-transparent to-accent-50/40" />
        <div className="relative p-6 sm:p-8">
          <h1 className="text-xl font-bold text-secondary-900 sm:text-2xl">
            Hoş geldiniz, {customer.name}
          </h1>
          <p className="mt-1 text-sm text-secondary-500">
            Hesabınızı buradan yönetebilirsiniz.
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {quickLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center gap-4 rounded-xl border border-secondary-200 bg-white p-5 transition-all hover:border-primary-300 hover:shadow-sm"
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.iconBg} transition-transform group-hover:scale-110`}>
              <item.icon className={`h-5 w-5 ${item.iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-secondary-900">{item.title}</h2>
              <p className="mt-0.5 text-xs text-secondary-500">{item.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-secondary-300 transition-colors group-hover:text-primary-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}
