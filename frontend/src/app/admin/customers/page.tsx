'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/ui/data-table';
import { formatPrice } from '@/lib/utils';
import type { Customer } from '@/types/api';

const statusOptions = [
  { value: '', label: 'Tüm Durumlar' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Pasif' },
];

export default function AdminCustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', page, search, status, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const { data } = await api.get(`/admin/customers?${params.toString()}`);
      return data;
    },
  });

  type CustomerRow = Customer & { [key: string]: unknown };
  const customers: CustomerRow[] = (data?.data || []).map((c: Customer) => ({ ...c }));
  const meta = data?.meta;

  const columns: Column<CustomerRow>[] = [
    {
      key: 'name',
      header: 'Ad Soyad',
      render: (row) => (
        <Link href={`/admin/customers/${row.id}`} className="font-medium text-primary-600 hover:text-primary-700">
          {row.name}
        </Link>
      ),
    },
    {
      key: 'email',
      header: 'E-posta',
      render: (row) => (
        <span className="text-sm text-secondary-600">{row.email}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Telefon',
      render: (row) => (
        <span className="text-sm text-secondary-500">{row.phone || '-'}</span>
      ),
    },
    {
      key: 'ordersCount',
      header: 'Sipariş',
      render: (row) => (
        <span className="text-sm font-medium text-secondary-900">{row.ordersCount ?? 0}</span>
      ),
    },
    {
      key: 'totalSpent',
      header: 'Toplam Harcama',
      render: (row) => (
        <span className="text-sm font-medium text-secondary-900">
          {formatPrice(row.totalSpent ?? 0)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Kayıt Tarihi',
      render: (row) => (
        <span className="text-sm text-secondary-500">
          {new Date(row.createdAt).toLocaleDateString('tr-TR')}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Durum',
      render: (row) => (
        <Badge variant={row.isActive ? 'success' : 'danger'}>
          {row.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary-900">Müşteriler</h1>
        <p className="mt-1 text-sm text-secondary-500">Tüm müşterileri yönetin</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Input
            placeholder="Ad, e-posta veya telefon ara..."
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
        data={customers}
        isLoading={isLoading}
        page={meta?.current_page}
        perPage={meta?.per_page}
        total={meta?.total}
        onPageChange={setPage}
      />
    </div>
  );
}
