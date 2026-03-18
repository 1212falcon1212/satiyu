'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, LogOut } from 'lucide-react';
import { useCustomerAuthStore } from '@/store/customer-auth';

export function HeaderAuth() {
  const [mounted, setMounted] = useState(false);
  const { customer, logout } = useCustomerAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (mounted && customer) {
    return (
      <div className="hidden sm:flex items-center gap-1">
        <Link
          href="/hesabim"
          className="flex items-center gap-1.5 px-2 py-1.5 text-secondary-600 hover:text-secondary-900 transition-colors"
        >
          <User className="h-5 w-5" />
          <span className="text-xs font-medium uppercase tracking-wide max-w-[80px] truncate">
            {customer.name.split(' ')[0]}
          </span>
        </Link>
        <button
          onClick={() => logout()}
          className="p-1.5 text-secondary-400 hover:text-secondary-700 transition-colors"
          aria-label="Çıkış Yap"
          title="Çıkış Yap"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/giris"
      className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 text-secondary-600 hover:text-secondary-900 transition-colors"
    >
      <User className="h-5 w-5" />
      <span className="text-[11px] font-semibold uppercase tracking-wider">
        Giriş / Kayıt
      </span>
    </Link>
  );
}
