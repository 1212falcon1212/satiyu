'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────
interface BatchResult {
  stock: string | null;
  price: string | null;
  items: number;
  time: string;
}

interface StockSyncLog {
  id: number;
  total_products: number;
  stock_changed: number;
  api_calls: number;
  failed: number;
  batch_request_ids: BatchResult[] | null;
  error_log: Array<{ message: string; chunk_size?: number; time: string }> | null;
  duration_seconds: number;
  started_at: string;
  completed_at: string;
}

// ─── Component ──────────────────────────────────────────────────
export default function StockSyncNotifications() {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{ data: StockSyncLog[] }>({
    queryKey: ['hepsiburada-stock-sync-results'],
    queryFn: async () => {
      const { data } = await api.get('/admin/hepsiburada/stock-sync-results');
      return data;
    },
    refetchInterval: 30_000,
  });

  const logs = data?.data ?? [];

  if (isLoading) return null;
  if (logs.length === 0) return null;

  const totalFailed = logs.reduce((s, l) => s + l.failed, 0);
  const totalChanged = logs.reduce((s, l) => s + l.stock_changed, 0);

  return (
    <div className="rounded-xl border border-secondary-200 bg-white overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-secondary-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-secondary-500" />
          <h3 className="text-sm font-semibold text-secondary-900">Stok Sync Bildirimleri</h3>
          <Badge variant="outline" className="text-[10px]">
            {logs.length}
          </Badge>
          {totalChanged > 0 && (
            <Badge variant="success" className="text-[10px] gap-1">
              <CheckCircle2 className="h-2.5 w-2.5" />
              {totalChanged} guncellendi
            </Badge>
          )}
          {totalFailed > 0 && (
            <Badge variant="danger" className="text-[10px] gap-1">
              <XCircle className="h-2.5 w-2.5" />
              {totalFailed} basarisiz
            </Badge>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-secondary-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-secondary-400" />
        )}
      </button>

      {/* Body */}
      {isOpen && (
        <div className="border-t border-secondary-200 divide-y divide-secondary-100">
          {logs.map((log) => {
            const isExpanded = expandedLog === log.id;
            const hasFailed = log.failed > 0;
            const hasErrors = (log.error_log?.length ?? 0) > 0;

            return (
              <div key={log.id} className="bg-white">
                {/* Row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={cn(
                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                    hasFailed || hasErrors ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500',
                  )}>
                    {hasFailed || hasErrors ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-secondary-600 font-medium">
                        {log.total_products} urun, {log.stock_changed} stok degisimi
                      </span>
                      <span className="text-[10px] text-secondary-400">
                        {formatDate(log.completed_at || log.started_at)} - {log.duration_seconds}sn
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-secondary-400">
                      {log.api_calls} API cagrisi
                      {log.failed > 0 && `, ${log.failed} basarisiz`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {log.stock_changed > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {log.stock_changed}
                      </span>
                    )}
                    {log.failed > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
                        <XCircle className="h-2.5 w-2.5" />
                        {log.failed}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-secondary-100 bg-secondary-50/50 px-4 py-3 space-y-3">
                    {/* API Results */}
                    {log.batch_request_ids && log.batch_request_ids.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-secondary-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          API Sonuclari
                        </p>
                        <div className="space-y-1">
                          {log.batch_request_ids.map((batch, idx) => (
                            <div key={idx} className={cn(
                              'rounded-md border px-3 py-2',
                              batch.stock === 'success' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50',
                            )}>
                              <div className="flex items-center gap-2">
                                {batch.stock === 'success' ? (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-red-500" />
                                )}
                                <span className={cn(
                                  'text-[11px] font-medium',
                                  batch.stock === 'success' ? 'text-emerald-700' : 'text-red-700',
                                )}>
                                  Stok: {batch.stock === 'success' ? 'Basarili' : batch.stock || 'Bilinmiyor'}
                                </span>
                                <span className="text-[10px] text-secondary-400">
                                  ({batch.items} urun)
                                </span>
                              </div>
                              {batch.price && (
                                <p className={cn(
                                  'text-[11px] mt-0.5',
                                  batch.price === 'success' ? 'text-emerald-600' : 'text-red-600',
                                )}>
                                  Fiyat: {batch.price === 'success' ? 'Basarili' : batch.price}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Errors */}
                    {hasErrors && (
                      <div>
                        <p className="text-[10px] font-medium text-red-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Hatalar
                        </p>
                        <div className="space-y-1">
                          {log.error_log!.map((err, idx) => (
                            <div key={idx} className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                              <p className="text-[11px] text-red-600">{err.message}</p>
                              <span className="text-[10px] text-red-400">{err.time}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No changes */}
                    {!hasErrors && !log.batch_request_ids?.length && log.stock_changed === 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <p className="text-xs text-amber-700 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          Stok degisikligi tespit edilmedi.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
