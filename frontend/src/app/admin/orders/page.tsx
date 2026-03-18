'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/ui/data-table';
import { formatPrice } from '@/lib/utils';
import type { Order } from '@/types/api';
import { MOCK_ADMIN_ORDERS } from '@/lib/mock-admin-data';

const statusOptions = [
  { value: '', label: 'Tüm Durumlar' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'confirmed', label: 'Onaylandı' },
  { value: 'preparing', label: 'Hazırlanıyor' },
  { value: 'shipped', label: 'Kargoda' },
  { value: 'delivered', label: 'Teslim Edildi' },
  { value: 'cancelled', label: 'İptal Edildi' },
];

const paymentStatusOptions = [
  { value: '', label: 'Tüm Ödeme Durumları' },
  { value: 'pending', label: 'Bekleniyor' },
  { value: 'paid', label: 'Ödendi' },
  { value: 'failed', label: 'Başarısız' },
  { value: 'refunded', label: 'İade Edildi' },
];

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

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, search, status, paymentStatus, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (paymentStatus) params.set('payment_status', paymentStatus);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const { data } = await api.get(`/admin/orders?${params.toString()}`);
      return data;
    },
  });

  const apiOrders = (data?.data || []).map((o: Order) => ({ ...o }));
  const orders: (Order & { [key: string]: unknown })[] = apiOrders.length > 0 ? apiOrders : MOCK_ADMIN_ORDERS.map((o) => ({ ...o }));
  const meta = data?.meta;

  const columns: Column<Order & { [key: string]: unknown }>[] = [
    {
      key: 'orderNumber',
      header: 'Sipariş No',
      render: (row) => (
        <Link href={`/admin/orders/${row.id}`} className="font-mono text-sm font-bold text-primary-600 hover:text-primary-700">
          {row.orderNumber}
        </Link>
      ),
    },
    {
      key: 'customer',
      header: 'Müşteri',
      render: (row) => (
        <div>
          <p className="font-medium text-secondary-900">{row.customer?.name || '-'}</p>
          <p className="text-xs text-secondary-500">{row.customer?.email || ''}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      render: (row) => {
        const s = statusBadge[row.status] || { label: row.status, variant: 'default' as const };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: 'paymentStatus',
      header: 'Ödeme',
      render: (row) => {
        const p = paymentBadge[row.paymentStatus] || { label: row.paymentStatus, variant: 'default' as const };
        return <Badge variant={p.variant}>{p.label}</Badge>;
      },
    },
    {
      key: 'total',
      header: 'Toplam',
      render: (row) => <span className="font-medium">{formatPrice(row.total)}</span>,
    },
    {
      key: 'createdAt',
      header: 'Tarih',
      render: (row) => (
        <span className="text-sm text-secondary-500">
          {new Date(row.createdAt).toLocaleDateString('tr-TR')}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary-900">Siparişler</h1>
        <p className="mt-1 text-sm text-secondary-500">Tüm siparişleri yönetin</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Input
            placeholder="Sipariş no veya müşteri ara..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-44">
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-44">
          <Select
            options={paymentStatusOptions}
            value={paymentStatus}
            onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-40">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            placeholder="Başlangıç"
          />
        </div>
        <div className="w-40">
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            placeholder="Bitiş"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        isLoading={isLoading}
        page={meta?.current_page}
        perPage={meta?.per_page}
        total={meta?.total}
        onPageChange={setPage}
      />
    </div>
  );
}
