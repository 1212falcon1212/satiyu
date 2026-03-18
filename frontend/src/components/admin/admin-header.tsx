'use client';

import { Menu, LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/breadcrumb';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface AdminHeaderProps {
  onMenuToggle: () => void;
  breadcrumbs?: BreadcrumbItem[];
}

export function AdminHeader({ onMenuToggle, breadcrumbs }: AdminHeaderProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/admin/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-secondary-200 bg-white/95 backdrop-blur-sm px-4 lg:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-md text-secondary-500 hover:bg-secondary-100 hover:text-secondary-700 transition-colors"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb items={breadcrumbs} />
        )}
      </div>

      {/* User dropdown */}
      <DropdownMenu
        trigger={
          <Button variant="ghost" size="sm" className="gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline text-sm font-medium text-secondary-700">
              {user?.name ?? 'Admin'}
            </span>
          </Button>
        }
      >
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-secondary-900">{user?.name ?? 'Admin'}</p>
          <p className="text-xs text-secondary-500">{user?.email ?? ''}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} danger>
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </DropdownMenuItem>
      </DropdownMenu>
    </header>
  );
}
