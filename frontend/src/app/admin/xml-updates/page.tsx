'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/ui/data-table';
import { formatPrice } from '@/lib/utils';

interface XmlUpdateLog {
  [key: string]: unknown;
  id: number;
  xml_source_id: number;
  product_id: number | null;
  product_name: string;
  change_type: 'price' | 'stock' | 'both';
  old_price: string | null;
  new_price: string | null;
  old_stock: number | null;
  new_stock: number | null;
  source_name: string;
  created_at: string;
}

interface XmlSource {
  id: number;
  name: string;
}

const changeTypeOptions = [
  { value: '', label: 'Tüm Değişiklikler' },
  { value: 'price', label: 'Fiyat' },
  { value: 'stock', label: 'Stok' },
  { value: 'both', label: 'Fiyat + Stok' },
];

function PriceCell({ oldVal, newVal }: { oldVal: string | null; newVal: string | null }) {
  if (oldVal === null && newVal === null) return <span className="text-secondary-400">-</span>;

  const oldNum = oldVal ? parseFloat(oldVal) : 0;
  const newNum = newVal ? parseFloat(newVal) : 0;
  const diff = newNum - oldNum;

  return (
    <div className="flex flex-col">
      <span className="text-xs text-secondary-400 line-through">{formatPrice(oldNum)}</span>
      <span className={diff > 0 ? 'font-medium text-green-600' : diff < 0 ? 'font-medium text-red-600' : 'font-medium'}>
        {formatPrice(newNum)}
      </span>
    </div>
  );
}

function StockCell({ oldVal, newVal }: { oldVal: number | null; newVal: number | null }) {
  if (oldVal === null && newVal === null) return <span className="text-secondary-400">-</span>;

  const oldNum = oldVal ?? 0;
  const newNum = newVal ?? 0;
  const diff = newNum - oldNum;

  return (
    <div className="flex flex-col">
      <span className="text-xs text-secondary-400 line-through">{oldNum}</span>
      <span className={diff > 0 ? 'font-medium text-green-600' : diff < 0 ? 'font-medium text-red-600' : 'font-medium'}>
        {newNum}
      </span>
    </div>
  );
}

export default function AdminXmlUpdatesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [changeType, setChangeType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: sourcesData } = useQuery({
    queryKey: ['admin', 'xml-sources-list'],
    queryFn: async () => {
      const { data } = await api.get('/admin/xml-sources?per_page=100');
      return data;
    },
  });

  const sources: XmlSource[] = sourcesData?.data || [];
  const sourceOptions = [
    { value: '', label: 'Tüm Kaynaklar' },
    ...sources.map((s) => ({ value: String(s.id), label: s.name })),
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'xml-updates', page, search, sourceId, changeType, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (search) params.set('search', search);
      if (sourceId) params.set('source_id', sourceId);
      if (changeType) params.set('change_type', changeType);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const { data } = await api.get(`/admin/xml-updates?${params.toString()}`);
      return data;
    },
  });

  const logs: XmlUpdateLog[] = data?.data || [];
  const meta = data ? { current_page: data.current_page, per_page: data.per_page, total: data.total } : undefined;

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, sourceId, changeType, dateFrom, dateTo]);

  const columns: Column<XmlUpdateLog>[] = [
    {
      key: 'product_name',
      header: 'Ürün Adı',
      render: (row) => (
        <div className="max-w-xs truncate font-medium text-secondary-900" title={row.product_name}>
          {row.product_name}
        </div>
      ),
    },
    {
      key: 'change_type',
      header: 'Tip',
      render: (row) => {
        const labels: Record<string, { text: string; cls: string }> = {
          price: { text: 'Fiyat', cls: 'bg-blue-100 text-blue-700' },
          stock: { text: 'Stok', cls: 'bg-orange-100 text-orange-700' },
          both: { text: 'Fiyat + Stok', cls: 'bg-purple-100 text-purple-700' },
        };
        const badge = labels[row.change_type] || { text: row.change_type, cls: 'bg-secondary-100 text-secondary-700' };
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
            {badge.text}
          </span>
        );
      },
    },
    {
      key: 'price',
      header: 'Fiyat Değişimi',
      render: (row) => <PriceCell oldVal={row.old_price} newVal={row.new_price} />,
    },
    {
      key: 'stock',
      header: 'Stok Değişimi',
      render: (row) => <StockCell oldVal={row.old_stock} newVal={row.new_stock} />,
    },
    {
      key: 'source_name',
      header: 'Kaynak',
      render: (row) => <span className="text-sm text-secondary-600">{row.source_name}</span>,
    },
    {
      key: 'created_at',
      header: 'Tarih',
      render: (row) => (
        <span className="text-sm text-secondary-500">
          {new Date(row.created_at).toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary-900">XML Güncellemeleri</h1>
        <p className="mt-1 text-sm text-secondary-500">XML kaynaklarından gelen fiyat ve stok değişikliklerini takip edin</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Input
            placeholder="Ürün adı ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            options={sourceOptions}
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            options={changeTypeOptions}
            value={changeType}
            onChange={(e) => setChangeType(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="Başlangıç"
          />
        </div>
        <div className="w-40">
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="Bitiş"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        page={meta?.current_page}
        perPage={meta?.per_page}
        total={meta?.total}
        onPageChange={setPage}
      />
    </div>
  );
}
