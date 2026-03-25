'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, User, ShoppingCart as CartIcon } from 'lucide-react';
import type { Category } from '@/types/api';
import { useSettings } from '@/hooks/useSettings';
import { useCustomerAuthStore } from '@/store/customer-auth';
import { SearchBar } from './SearchBar';
import { HeaderFavorites } from './HeaderFavorites';
import { MiniCart } from './MiniCart';
import { MobileMenu } from './MobileMenu';
import { CategoryNavBar } from './CategoryNavBar';

interface ShopHeaderProps {
  categories: Category[];
}

export function ShopHeader({ categories }: ShopHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const settings = useSettings();
  const siteName = settings.general?.site_name || 'Moda';
  const siteLogo = settings.general?.site_logo;
  const { customer } = useCustomerAuthStore();

  return (
    <>
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        {/* Main header — lazimbana style: Logo | Search | Hesabım + Sepet */}
        <div className="border-b border-secondary-100">
          <div className="container-main flex h-[70px] items-center gap-6">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-primary-900 hover:text-accent lg:hidden"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0 min-w-0">
              {siteLogo ? (
                <Image
                  src={siteLogo.startsWith('http') ? siteLogo : `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '')}${siteLogo}`}
                  alt={siteName}
                  width={200}
                  height={56}
                  className="h-10 w-auto max-w-[160px] object-contain"
                  unoptimized
                />
              ) : (
                <span className="font-display text-2xl font-bold tracking-tight text-primary-900">
                  {siteName}
                </span>
              )}
            </Link>

            {/* Center: Search bar — desktop */}
            <div className="hidden lg:flex flex-1 mx-4">
              <SearchBar inline />
            </div>

            {/* Right: Hesabım + Sepet */}
            <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
              {/* Mobile search */}
              <div className="lg:hidden">
                <SearchBar />
              </div>

              {/* Hesabım — desktop */}
              <Link
                href={customer ? '/hesabim' : '/giris'}
                className="hidden lg:flex items-center gap-2 text-secondary-700 hover:text-secondary-900 transition-colors"
              >
                <User className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {customer ? 'Hesabım' : 'Giriş Yap'}
                </span>
              </Link>

              <HeaderFavorites />
              <MiniCart />
            </div>
          </div>
        </div>

        {/* Category navigation bar */}
        <CategoryNavBar categories={categories} />
      </header>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        categories={categories}
      />
    </>
  );
}
