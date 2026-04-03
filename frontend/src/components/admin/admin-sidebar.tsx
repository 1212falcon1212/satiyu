'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Tags,
  Layers,
  FolderTree,
  Image,
  LayoutGrid,
  FileText,
  FileCode,
  Store,
  ShieldCheck,
  ShoppingCart,
  Users,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  RotateCcw,
  Newspaper,
  RefreshCw,
  Menu as MenuIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Ürünler',
    items: [
      { label: 'Ürünler', href: '/admin/products', icon: Package },
      { label: 'Markalar', href: '/admin/brands', icon: Tags },
      { label: 'Varyant Tipleri', href: '/admin/variant-types', icon: Layers },
      { label: 'Kategoriler', href: '/admin/categories', icon: FolderTree },
      { label: 'Toplu İşlemler', href: '/admin/toplu-islemler', icon: Settings },
    ],
  },
  {
    title: 'İçerik',
    items: [
      { label: 'Ana Sayfa Yönetimi', href: '/admin/homepage', icon: LayoutGrid },
      { label: 'Menü', href: '/admin/menu', icon: MenuIcon },
      { label: 'Banner\'lar', href: '/admin/banners', icon: Image },
      { label: 'Güven Rozetleri', href: '/admin/trust-badges', icon: ShieldCheck },
      { label: 'Blog Yazıları', href: '/admin/blog-posts', icon: Newspaper },
      { label: 'Sayfalar', href: '/admin/pages', icon: FileText },
    ],
  },
  {
    title: 'Pazaryeri',
    items: [
      { label: 'XML Kaynakları', href: '/admin/xml-sources', icon: FileCode },
      { label: 'XML Güncellemeleri', href: '/admin/xml-updates', icon: RefreshCw },
      { label: 'Trendyol', href: '/admin/trendyol', icon: Store },
      { label: 'Hepsiburada', href: '/admin/hepsiburada', icon: Store },
      { label: 'Çiçeksepeti', href: '/admin/ciceksepeti', icon: Store },
    ],
  },
  {
    title: 'Ürün Gönderim',
    items: [
      { label: 'Trendyol Gönderim', href: '/admin/trendyol/products', icon: Send },
      { label: 'Hepsiburada Gönderim', href: '/admin/hepsiburada/products', icon: Send },
      { label: 'Çiçeksepeti Gönderim', href: '/admin/ciceksepeti/products', icon: Send },
    ],
  },
  {
    title: 'Sipariş Yönetimi',
    items: [
      { label: 'Siparişler', href: '/admin/orders', icon: ShoppingCart },
      { label: 'İadeler', href: '/admin/refunds', icon: RotateCcw },
    ],
  },
  {
    title: 'Müşteri Yönetimi',
    items: [
      { label: 'Müşteriler', href: '/admin/customers', icon: Users },
    ],
  },
  {
    items: [
      { label: 'Yorumlar', href: '/admin/reviews', icon: MessageSquare },
      { label: 'Ayarlar', href: '/admin/settings', icon: Settings },
    ],
  },
];

interface AdminSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AdminSidebar({ mobileOpen, onMobileClose }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const settings = useSettings();
  const siteName = settings.general?.site_name || 'Admin';

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Top gradient line */}
      <div className="h-0.5 bg-gradient-to-r from-primary-600 to-accent-500" />

      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-secondary-200 px-4">
        {!collapsed && (
          <Link href="/admin" className="font-display text-lg font-bold text-primary-700">
            {siteName}
          </Link>
        )}
        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex h-8 w-8 items-center justify-center rounded-md text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 transition-colors"
          aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="lg:hidden flex h-8 w-8 items-center justify-center rounded-md text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 transition-colors"
          aria-label="Menüyü kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {menuSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {section.title && !collapsed && (
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-secondary-400">
                  {section.title}
                </p>
              )}
              {section.title && collapsed && (
                <div className="mb-2 mx-auto h-px w-6 bg-secondary-200" />
              )}
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onMobileClose}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          active
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900'
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon className={cn('h-5 w-5 shrink-0', active && 'text-primary-600')} />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-secondary-200 transform transition-transform duration-200 ease-in-out lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 bg-white border-r border-secondary-200 transition-all duration-200',
          collapsed ? 'lg:w-16' : 'lg:w-64'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
