'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import type { RefundRequest } from '@/types/api';

const refundStatusMap: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' }> = {
  pending: { label: 'Beklemede', variant: 'warning' },
  approved: { label: 'Onaylandı', variant: 'success' },
  rejected: { label: 'Reddedildi', variant: 'danger' },
};

export default function AdminRefundsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-refunds', page, search, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const { data } = await api.get(`/admin/refunds?${params.toString()}`);
      return data;
    },
  });

  type RefundRow = RefundRequest & { [key: string]: unknown };
  const refunds: RefundRow[] = (data?.data ?? []).map((r: RefundRequest) => ({ ...r }));
  const total = data?.meta?.total ?? data?.total ?? 0;

  const columns: Column<RefundRow>[] = [
    {
      key: 'id',
      header: 'Talep No',
      render: (r) => (
        <Link href={`/admin/refunds/${r.id}`} className="font-mono text-sm font-bold text-primary-600 hover:text-primary-700">
          #{r.id}
        </Link>
      ),
    },
    {
      key: 'order',
      header: 'Sipariş No',
      render: (r) => (
        <span className="font-mono text-sm">{r.order?.orderNumber ?? '-'}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Müşteri',
      render: (r) => <span className="text-sm">{r.customer?.name ?? '-'}</span>,
    },
    {
      key: 'reason',
      header: 'Sebep',
      render: (r) => (
        <span className="text-sm text-secondary-600 line-clamp-1">{r.reason}</span>
      ),
    },
    {
      key: 'refund_amount',
      header: 'Tutar',
      render: (r) => <span className="text-sm font-semibold">{formatPrice(r.refund_amount)}</span>,
    },
    {
      key: 'status',
      header: 'Durum',
      render: (r) => {
        const s = refundStatusMap[r.status] ?? { label: r.status, variant: 'warning' as const };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: 'created_at',
      header: 'Tarih',
      render: (r) => (
        <span className="text-sm text-secondary-500">
          {new Date(r.created_at).toLocaleDateString('tr-TR')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-secondary-900">İade Talepleri</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Sipariş no veya müşteri adı..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="sm:max-w-xs"
        />
        <Select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="sm:max-w-[180px]"
          placeholder="Tüm Durumlar"
          options={[
            { value: '', label: 'Tüm Durumlar' },
            { value: 'pending', label: 'Beklemede' },
            { value: 'approved', label: 'Onaylandı' },
            { value: 'rejected', label: 'Reddedildi' },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        data={refunds}
        isLoading={isLoading}
        emptyMessage="İade talebi bulunamadı."
        page={page}
        total={total}
        perPage={20}
        onPageChange={setPage}
        keyExtractor={(r) => r.id}
      />
    </div>
  );
}
