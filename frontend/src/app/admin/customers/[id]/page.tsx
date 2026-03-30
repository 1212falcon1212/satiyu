'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  ShoppingCart,
  MapPin,
  Star,
  Mail,
  Phone,
  Calendar,
  Shield,
  ShieldOff,
} from 'lucide-react';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { Customer } from '@/types/api';

const statusBadge: Record<string, { label: string; variant: 'default' | 'info' | 'warning' | 'success' | 'danger' }> = {
  pending: { label: 'Beklemede', variant: 'warning' },
  confirmed: { label: 'Onaylandı', variant: 'info' },
  preparing: { label: 'Hazırlanıyor', variant: 'info' },
  shipped: { label: 'Kargoda', variant: 'default' },
  delivered: { label: 'Teslim Edildi', variant: 'success' },
  cancelled: { label: 'İptal Edildi', variant: 'danger' },
};

const paymentBadge: Record<string, { label: string; variant: 'default' | 'info' | 'warning' | 'success' | 'danger' }> = {
  pending: { label: 'Bekleniyor', variant: 'warning' },
  paid: { label: 'Ödendi', variant: 'success' },
  failed: { label: 'Başarısız', variant: 'danger' },
  refunded: { label: 'İade', variant: 'info' },
};

type TabKey = 'info' | 'orders' | 'addresses';

export default function AdminCustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('info');

  const { data: customer, isLoading } = useQuery<Customer>({
    queryKey: ['admin-customer', id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/customers/${id}`);
      return data.data;
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (isActive: boolean) => api.put(`/admin/customers/${id}`, { is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customer', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast.success('Müşteri durumu güncellendi.');
    },
    onError: () => toast.error('Durum güncellenemedi.'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-secondary-100" />
        <div className="h-24 animate-pulse rounded-xl bg-secondary-100" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-secondary-100" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-secondary-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!customer) return <p className="text-secondary-500">Müşteri bulunamadı.</p>;

  const tabs: { key: TabKey; label: string; icon: typeof User }[] = [
    { key: 'info', label: 'Bilgiler', icon: User },
    { key: 'orders', label: `Siparişler (${customer.orders?.length ?? 0})`, icon: ShoppingCart },
    { key: 'addresses', label: `Adresler (${customer.addresses?.length ?? 0})`, icon: MapPin },
  ];

  return (
    <div>
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push('/admin/customers')}
        className="mb-4 flex items-center gap-2 text-sm text-secondary-500 hover:text-secondary-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Müşterilere Dön
      </button>

      {/* Header */}
      <div className="mb-6 rounded-xl border border-secondary-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
              <User className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-secondary-900">{customer.name}</h1>
                <Badge variant={customer.isActive ? 'success' : 'danger'}>
                  {customer.isActive ? 'Aktif' : 'Pasif'}
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-secondary-500">{customer.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right mr-4">
              <p className="text-xs text-secondary-400">Toplam Harcama</p>
              <p className="text-lg font-bold text-primary-600">{formatPrice(customer.totalSpent ?? 0)}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleActiveMutation.mutate(!customer.isActive)}
              loading={toggleActiveMutation.isPending}
              className={customer.isActive ? 'border-danger/30 text-danger hover:bg-danger/5' : 'border-success/30 text-success hover:bg-success/5'}
            >
              {customer.isActive ? (
                <>
                  <ShieldOff className="h-4 w-4" />
                  Pasife Al
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Aktife Al
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-secondary-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-secondary-500 hover:border-secondary-300 hover:text-secondary-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'info' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-secondary-400" />
                Profil Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-secondary-400" />
                  <div>
                    <p className="text-xs text-secondary-400">E-posta</p>
                    <p className="text-sm font-medium text-secondary-900">{customer.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-secondary-400" />
                  <div>
                    <p className="text-xs text-secondary-400">Telefon</p>
                    <p className="text-sm font-medium text-secondary-900">{customer.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-secondary-400" />
                  <div>
                    <p className="text-xs text-secondary-400">Kayıt Tarihi</p>
                    <p className="text-sm font-medium text-secondary-900">
                      {new Date(customer.createdAt).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-secondary-400" />
                Sipariş Özeti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-secondary-50 p-4 text-center">
                  <p className="text-2xl font-bold text-secondary-900">{customer.ordersCount ?? 0}</p>
                  <p className="text-xs text-secondary-500">Toplam Sipariş</p>
                </div>
                <div className="rounded-lg bg-primary-50 p-4 text-center">
                  <p className="text-2xl font-bold text-primary-600">{formatPrice(customer.totalSpent ?? 0)}</p>
                  <p className="text-xs text-secondary-500">Toplam Harcama</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews */}
          {customer.reviews && customer.reviews.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-secondary-400" />
                  Yorumlar ({customer.reviews.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-secondary-100">
                  {customer.reviews.map((review) => (
                    <div key={review.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-secondary-200'}`}
                              />
                            ))}
                          </div>
                          {review.product && (
                            <Link
                              href={`/admin/products/${review.product.id}`}
                              className="text-sm text-primary-600 hover:text-primary-700"
                            >
                              {review.product.name}
                            </Link>
                          )}
                        </div>
                        <Badge variant={review.isApproved ? 'success' : 'warning'}>
                          {review.isApproved ? 'Onaylı' : 'Beklemede'}
                        </Badge>
                      </div>
                      {review.comment && (
                        <p className="mt-1 text-sm text-secondary-600">{review.comment}</p>
                      )}
                      <p className="mt-1 text-xs text-secondary-400">
                        {new Date(review.createdAt).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'orders' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-secondary-400" />
              Son Siparişler
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!customer.orders || customer.orders.length === 0 ? (
              <p className="py-8 text-center text-sm text-secondary-400">Henüz sipariş yok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500">Sipariş No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500">Tarih</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500">Toplam</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500">Durum</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500">Ödeme</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-200">
                    {customer.orders.map((order) => {
                      const s = statusBadge[order.status] || { label: order.status, variant: 'default' as const };
                      const p = paymentBadge[order.paymentStatus] || { label: order.paymentStatus, variant: 'default' as const };
                      return (
                        <tr key={order.id} className="hover:bg-secondary-50 transition-colors">
                          <td className="px-4 py-3">
                            <Link href={`/admin/orders/${order.id}`} className="font-mono text-sm font-bold text-primary-600 hover:text-primary-700">
                              {order.orderNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-secondary-500">
                            {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-secondary-900">
                            {formatPrice(order.total)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={s.variant}>{s.label}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={p.variant}>{p.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'addresses' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {!customer.addresses || customer.addresses.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-sm text-secondary-400">Henüz kayıtlı adres yok.</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            customer.addresses.map((address) => (
              <Card key={address.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-secondary-400" />
                      {address.title}
                    </span>
                    {address.isDefault && (
                      <Badge variant="info">Varsayılan</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5 text-sm">
                    <p className="font-medium text-secondary-900">{address.fullName}</p>
                    <p className="text-secondary-500">{address.phone}</p>
                    <p className="text-secondary-600 leading-relaxed">
                      {address.addressLine}
                      {address.neighborhood && `, ${address.neighborhood}`}
                    </p>
                    <p className="text-secondary-600">
                      {address.district}/{address.city}
                      {address.postalCode && ` - ${address.postalCode}`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
