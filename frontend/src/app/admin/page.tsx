'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  ShoppingCart,
  DollarSign,
  FileCode,
  Users,
  Tag,
  FolderTree,
  Star,
  PackageCheck,
  PackageX,
  Clock,
  ChevronRight,
} from 'lucide-react';

interface DashboardData {
  totalProducts: number;
  activeProducts: number;
  inStockProducts: number;
  outOfStockProducts: number;
  featuredProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalBrands: number;
  totalCategories: number;
  totalCustomers: number;
  activeXmlSources: number;
  recentOrders: RecentOrder[];
}

interface RecentOrder {
  id: number;
  orderNumber: string;
  customerName: string;
  total: number | string;
  status: string;
  createdAt: string;
  itemCount: number;
}

const statusVariantMap: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'> = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'info',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'danger',
};

const statusLabelMap: Record<string, string> = {
  pending: 'Bekliyor',
  confirmed: 'Onaylandı',
  preparing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
};

function StatCard({
  title,
  value,
  icon: Icon,
  isLoading,
  color = 'primary',
  href,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  isLoading: boolean;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  href?: string;
}) {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
    info: 'bg-blue-50 text-blue-600',
  };

  const content = (
    <Card className={href ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-secondary-500 truncate">{title}</p>
          {isLoading ? (
            <Skeleton className="mt-1 h-7 w-16" />
          ) : (
            <p className="text-xl font-bold text-secondary-900">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard/stats');
      return data.data;
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-secondary-900">Dashboard</h1>

      {/* Main Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam Ürün"
          value={String(data?.totalProducts ?? 0)}
          icon={Package}
          isLoading={isLoading}
          href="/admin/products"
        />
        <StatCard
          title="Toplam Sipariş"
          value={String(data?.totalOrders ?? 0)}
          icon={ShoppingCart}
          isLoading={isLoading}
          href="/admin/orders"
        />
        <StatCard
          title="Toplam Gelir"
          value={formatPrice(data?.totalRevenue ?? 0)}
          icon={DollarSign}
          isLoading={isLoading}
          color="success"
        />
        <StatCard
          title="Müşteriler"
          value={String(data?.totalCustomers ?? 0)}
          icon={Users}
          isLoading={isLoading}
          color="info"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard
          title="Stokta Var"
          value={String(data?.inStockProducts ?? 0)}
          icon={PackageCheck}
          isLoading={isLoading}
          color="success"
        />
        <StatCard
          title="Stokta Yok"
          value={String(data?.outOfStockProducts ?? 0)}
          icon={PackageX}
          isLoading={isLoading}
          color="danger"
        />
        <StatCard
          title="Öne Çıkan"
          value={String(data?.featuredProducts ?? 0)}
          icon={Star}
          isLoading={isLoading}
          color="warning"
        />
        <StatCard
          title="Bekleyen Sipariş"
          value={String(data?.pendingOrders ?? 0)}
          icon={Clock}
          isLoading={isLoading}
          color="warning"
          href="/admin/orders"
        />
        <StatCard
          title="Markalar"
          value={String(data?.totalBrands ?? 0)}
          icon={Tag}
          isLoading={isLoading}
          href="/admin/brands"
        />
        <StatCard
          title="Kategoriler"
          value={String(data?.totalCategories ?? 0)}
          icon={FolderTree}
          isLoading={isLoading}
          href="/admin/categories"
        />
      </div>

      {/* Quick Links + Recent Orders */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Hızlı Erişim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              { label: 'Ürünler', href: '/admin/products', icon: Package },
              { label: 'Siparişler', href: '/admin/orders', icon: ShoppingCart },
              { label: 'Kategoriler', href: '/admin/categories', icon: FolderTree },
              { label: 'Markalar', href: '/admin/brands', icon: Tag },
              { label: 'XML Kaynakları', href: '/admin/xml-sources', icon: FileCode },
              { label: 'Ayarlar', href: '/admin/settings', icon: Package },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-secondary-700 hover:bg-secondary-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="h-4 w-4 text-secondary-400" />
                  {item.label}
                </div>
                <ChevronRight className="h-4 w-4 text-secondary-300" />
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Son Siparişler</CardTitle>
            <Link
              href="/admin/orders"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Tümünü Gör
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !data?.recentOrders?.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-secondary-400">
                <ShoppingCart className="h-10 w-10 mb-2" />
                <p className="text-sm">Henüz sipariş bulunmuyor.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-secondary-200">
                      <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500">
                        Sipariş No
                      </th>
                      <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500">
                        Müşteri
                      </th>
                      <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500">
                        Tutar
                      </th>
                      <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500">
                        Durum
                      </th>
                      <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500">
                        Tarih
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-200">
                    {data.recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-secondary-50">
                        <td className="py-3 text-sm font-medium text-secondary-900">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="text-primary-600 hover:text-primary-700"
                          >
                            #{order.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 text-sm text-secondary-700">
                          {order.customerName}
                        </td>
                        <td className="py-3 text-sm font-medium text-secondary-900">
                          {formatPrice(Number(order.total))}
                        </td>
                        <td className="py-3">
                          <Badge variant={statusVariantMap[order.status] ?? 'outline'}>
                            {statusLabelMap[order.status] ?? order.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-sm text-secondary-500">
                          {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
