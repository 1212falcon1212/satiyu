'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────
interface BatchProduct {
  product_id: number;
  product_name: string;
  status: string;
}

interface BatchError {
  id: number;
  product_id: number;
  product_name: string;
  product_barcode: string;
  error_message: string;
}

interface BatchResult {
  batch_request_id: string;
  total_items: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  on_sale_count: number;
  created_at: string;
  updated_at: string;
  errors: BatchError[];
  products: BatchProduct[];
}

interface CheckFailedItem {
  productName: string;
  barcode: string;
  reasons: string;
  failedVariants?: number;
  totalVariants?: number;
}

interface CheckResult {
  message: string;
  successCount: number;
  failCount: number;
  failedItems: CheckFailedItem[];
  hbStatus: string | null;
  hbItemCount: number;
}

// ─── Component ──────────────────────────────────────────────────
export default function BatchNotifications() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [checkResults, setCheckResults] = useState<Record<string, CheckResult>>({});

  const { data, isLoading } = useQuery<{ data: BatchResult[] }>({
    queryKey: ['hepsiburada-batch-results'],
    queryFn: async () => {
      const { data } = await api.get('/admin/hepsiburada/batch-results');
      return data;
    },
    refetchInterval: 30_000,
  });

  const checkMutation = useMutation({
    mutationFn: async (trackingId: string) => {
      const { data } = await api.post<CheckResult>(`/admin/hepsiburada/batch/${trackingId}/check`);
      return { trackingId, result: data };
    },
    onSuccess: ({ trackingId, result }) => {
      toast.success(result.message);
      setCheckResults((prev) => ({ ...prev, [trackingId]: result }));
      setExpandedBatch(trackingId);
      queryClient.invalidateQueries({ queryKey: ['hepsiburada-batch-results'] });
      queryClient.invalidateQueries({ queryKey: ['hepsiburada-local-products'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'HB kontrol hatası');
    },
  });

  const batches = data?.data ?? [];

  if (isLoading) return null;
  if (batches.length === 0) return null;

  const totalPending = batches.reduce((s, b) => s + Number(b.pending_count), 0);
  const totalRejected = batches.reduce((s, b) => s + Number(b.rejected_count), 0);

  return (
    <div className="rounded-xl border border-secondary-200 bg-white overflow-hidden">
      {/* Header — toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-secondary-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-secondary-500" />
          <h3 className="text-sm font-semibold text-secondary-900">Gönderim Bildirimleri</h3>
          <Badge variant="outline" className="text-[10px]">
            {batches.length}
          </Badge>
          {totalPending > 0 && (
            <Badge variant="warning" className="text-[10px] gap-1">
              <Clock className="h-2.5 w-2.5" />
              {totalPending} beklemede
            </Badge>
          )}
          {totalRejected > 0 && (
            <Badge variant="danger" className="text-[10px] gap-1">
              <XCircle className="h-2.5 w-2.5" />
              {totalRejected} başarısız
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
          {batches.map((batch) => {
            const isExpanded = expandedBatch === batch.batch_request_id;
            const hasErrors = Number(batch.rejected_count) > 0;
            const allSuccess = Number(batch.approved_count) + Number(batch.on_sale_count) === Number(batch.total_items);
            const allPending = Number(batch.pending_count) === Number(batch.total_items);
            const hbResult = checkResults[batch.batch_request_id];
            const isChecking = checkMutation.isPending && checkMutation.variables === batch.batch_request_id;

            const uniqueProducts = batch.products?.reduce((acc, p) => {
              if (!acc.find((x) => x.product_id === p.product_id)) acc.push(p);
              return acc;
            }, [] as BatchProduct[]) ?? [];

            return (
              <div key={batch.batch_request_id} className="bg-white">
                {/* Batch row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={cn(
                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                    allSuccess && 'bg-emerald-50 text-emerald-500',
                    hasErrors && 'bg-red-50 text-red-500',
                    allPending && 'bg-amber-50 text-amber-500',
                    !allSuccess && !hasErrors && !allPending && 'bg-blue-50 text-blue-500',
                  )}>
                    {allSuccess ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : hasErrors ? (
                      <XCircle className="h-4 w-4" />
                    ) : allPending ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-secondary-600 font-medium">
                        {uniqueProducts.length} ürün ({batch.total_items} varyant)
                      </span>
                      <span className="text-[10px] text-secondary-400">
                        {formatDate(batch.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-secondary-400 truncate max-w-[400px]">
                      {uniqueProducts.map((p) => p.product_name).join(', ')}
                    </p>
                  </div>

                  {/* Status pills */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {Number(batch.approved_count) > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {batch.approved_count}
                      </span>
                    )}
                    {Number(batch.on_sale_count) > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                        <Package className="h-2.5 w-2.5" />
                        {batch.on_sale_count}
                      </span>
                    )}
                    {Number(batch.pending_count) > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        <Clock className="h-2.5 w-2.5" />
                        {batch.pending_count}
                      </span>
                    )}
                    {Number(batch.rejected_count) > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
                        <XCircle className="h-2.5 w-2.5" />
                        {batch.rejected_count}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => checkMutation.mutate(batch.batch_request_id)}
                      disabled={checkMutation.isPending}
                      className="h-7 px-2 text-[11px]"
                    >
                      {isChecking ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      HB Kontrol
                    </Button>
                    <button
                      type="button"
                      onClick={() => setExpandedBatch(isExpanded ? null : batch.batch_request_id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-secondary-100 bg-secondary-50/50 px-4 py-3 space-y-3">
                    {/* HB check result */}
                    {hbResult && (
                      <div className={cn(
                        'rounded-lg border p-3',
                        hbResult.hbStatus === 'PROCESSING' ? 'border-blue-200 bg-blue-50' :
                        hbResult.failCount > 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50',
                      )}>
                        <div className="flex items-center gap-2 mb-2">
                          {hbResult.hbStatus === 'PROCESSING' ? (
                            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                          ) : hbResult.failCount > 0 ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                          <span className={cn(
                            'text-xs font-semibold',
                            hbResult.hbStatus === 'PROCESSING' ? 'text-blue-700' :
                            hbResult.failCount > 0 ? 'text-red-700' : 'text-emerald-700',
                          )}>
                            Hepsiburada Yanıtı
                          </span>
                          <span className="text-[10px] text-secondary-500">
                            {hbResult.hbItemCount} item
                          </span>
                          <Badge variant={
                            hbResult.hbStatus === 'COMPLETED' ? 'success' :
                            hbResult.hbStatus === 'PROCESSING' ? 'warning' :
                            hbResult.hbStatus === 'PARTIAL' ? 'warning' : 'outline'
                          } className="text-[9px]">
                            {hbResult.hbStatus ?? '—'}
                          </Badge>
                        </div>

                        {hbResult.hbStatus === 'PROCESSING' && (
                          <p className="text-xs text-blue-600 mb-1">
                            Ürünler HB tarafında işleniyor, birkaç dakika sonra tekrar kontrol edin.
                          </p>
                        )}

                        {hbResult.successCount > 0 && (
                          <p className="text-xs text-emerald-600 mb-1">
                            {hbResult.successCount} ürün başarıyla onaylandı
                          </p>
                        )}

                        {hbResult.failCount > 0 && (
                          <p className="text-xs text-red-600 mb-1">
                            {hbResult.failCount} ürün başarısız
                          </p>
                        )}

                        {hbResult.failedItems.length > 0 && (
                          <div className="space-y-2 mt-2">
                            {hbResult.failedItems.map((item, idx) => (
                              <div key={idx} className="rounded-md border border-red-200 bg-white px-3 py-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                                  <span className="text-xs font-medium text-red-800">
                                    {item.productName}
                                  </span>
                                  <span className="text-[10px] text-red-400 font-mono">
                                    {item.barcode}
                                  </span>
                                  {item.failedVariants != null && item.totalVariants != null && (
                                    <span className="text-[10px] text-red-400">
                                      ({item.failedVariants}/{item.totalVariants} varyant başarısız)
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-red-600 leading-relaxed pl-5">
                                  {item.reasons}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Local error details */}
                    {!hbResult && hasErrors && batch.errors?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-red-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Hata Detayları (local)
                        </p>
                        <div className="space-y-1.5">
                          {batch.errors.map((err) => (
                            <div
                              key={err.id}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2"
                            >
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-medium text-red-800">
                                  {err.product_name.length > 50 ? err.product_name.slice(0, 50) + '...' : err.product_name}
                                </span>
                                {err.product_barcode && (
                                  <span className="font-mono text-[10px] text-red-400">
                                    {err.product_barcode}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-red-600 leading-relaxed">
                                {err.error_message}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Product list */}
                    {uniqueProducts.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-secondary-400 uppercase tracking-wider mb-1.5">Ürünler</p>
                        <div className="flex flex-wrap gap-1.5">
                          {uniqueProducts.map((p) => {
                            const statuses = batch.products?.filter((x) => x.product_id === p.product_id) ?? [];
                            const hasRejected = statuses.some((s) => s.status === 'rejected');
                            const allApproved = statuses.every((s) => s.status === 'approved' || s.status === 'on_sale');
                            return (
                              <span
                                key={p.product_id}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium',
                                  allApproved && 'bg-emerald-100 text-emerald-700',
                                  hasRejected && 'bg-red-100 text-red-700',
                                  !allApproved && !hasRejected && 'bg-amber-100 text-amber-700',
                                )}
                              >
                                {allApproved ? <CheckCircle2 className="h-2.5 w-2.5" /> : hasRejected ? <XCircle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                                {p.product_name.length > 40 ? p.product_name.slice(0, 40) + '...' : p.product_name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Pending hint */}
                    {allPending && !hbResult && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <p className="text-xs text-amber-700 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          Ürünler Hepsiburada&apos;ya gönderildi, yanıt bekleniyor. &quot;HB Kontrol&quot; butonuna tıklayarak güncel durumu öğrenebilirsiniz.
                        </p>
                      </div>
                    )}

                    {/* Tracking ID */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-secondary-400">Tracking ID:</span>
                      <code className="text-[10px] font-mono text-secondary-500 bg-secondary-100 rounded px-1.5 py-0.5 select-all">
                        {batch.batch_request_id}
                      </code>
                    </div>
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

// ─── Helpers ────────────────────────────────────────────────────
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
