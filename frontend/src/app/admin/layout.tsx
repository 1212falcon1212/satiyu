'use client';

import { usePathname } from 'next/navigation';
import { AdminLayout } from '@/components/admin/admin-layout';
import { AdminGuard } from '@/components/admin/admin-guard';

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AdminGuard>
      <AdminLayout>{children}</AdminLayout>
    </AdminGuard>
  );
}
