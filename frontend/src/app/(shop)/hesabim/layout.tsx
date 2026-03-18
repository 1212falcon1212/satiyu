'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Package, MapPin, Heart, Settings, LogOut, User, CreditCard } from 'lucide-react';
import { useCustomerAuthStore } from '@/store/customer-auth';

const menuItems = [
  { href: '/hesabim', icon: User, label: 'Hesabım' },
  { href: '/hesabim/siparislerim', icon: Package, label: 'Siparişlerim' },
  { href: '/hesabim/adreslerim', icon: MapPin, label: 'Adreslerim' },
  { href: '/hesabim/favorilerim', icon: Heart, label: 'Favorilerim' },
  { href: '/hesabim/kartlarim', icon: CreditCard, label: 'Kartlarım' },
  { href: '/hesabim/ayarlar', icon: Settings, label: 'Ayarlar' },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { customer, logout } = useCustomerAuthStore();

  useEffect(() => {
    if (!customer) {
      router.replace(`/giris?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [customer, router, pathname]);

  if (!customer) return null;

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const initials = customer.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="container-main py-8 lg:py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Sidebar */}
        <aside className="w-full shrink-0 lg:w-64">
          <div className="rounded-2xl border border-secondary-200 bg-white overflow-hidden">
            {/* User info */}
            <div className="border-b border-secondary-100 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-secondary-900">
                    {customer.name}
                  </p>
                  <p className="truncate text-xs text-secondary-400">{customer.email}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-row gap-1 p-2 lg:flex-col">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                    }`}
                  >
                    <item.icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-primary-600' : 'text-secondary-400'}`} />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-secondary-400 transition-colors hover:bg-danger/5 hover:text-danger"
              >
                <LogOut className="h-[18px] w-[18px] shrink-0" />
                <span className="hidden sm:inline">Çıkış Yap</span>
              </button>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
