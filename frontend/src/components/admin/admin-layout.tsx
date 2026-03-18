'use client';

import { useState, type ReactNode } from 'react';
import { AdminSidebar } from './admin-sidebar';
import { AdminHeader } from './admin-header';
import { type BreadcrumbItem } from '@/components/ui/breadcrumb';

interface AdminLayoutProps {
  children: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export function AdminLayout({ children, breadcrumbs }: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content area - offset by sidebar width on desktop */}
      <div className="lg:pl-64">
        <AdminHeader
          onMenuToggle={() => setMobileOpen(true)}
          breadcrumbs={breadcrumbs}
        />

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
