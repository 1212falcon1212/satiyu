'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import {
  ArrowLeft,
  Package,
  User,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  MapPin,
  CreditCard,
} from 'lucide-react';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { RefundRequest } from '@/types/api';

const refundStatusConfig: Record<string, { label: string; variant: 'warning' | 'success' | 'danger'; icon: typeof Clock }> = {
  pending: { label: 'Beklemede', variant: 'warning', icon: Clock },
  approved: { label: 'Onaylandı', variant: 'success', icon: CheckCircle },
  rejected: { label: 'Reddedildi', variant: 'danger', icon: XCircle },
};

const paymentMethodLabel: Record<string, string> = {
  cash_on_delivery: 'Kapıda Ödeme',
  bank_transfer: 'Havale / EFT',
  credit_card: 'Kredi / Banka Kartı',
};

export default function AdminRefundDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [adminNote, setAdminNote] = useState('');

  const { data, isLoading } = useQuery<RefundRequest>({
    queryKey: ['admin-refund', id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/refunds/${id}`);
      return data.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => api.put(`/admin/refunds/${id}/approve`),
    onSuccess: () => {
      toast.success('İade talebi onaylandı.');
      queryClient.invalidateQueries({ queryKey: ['admin-refund', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      setShowApproveDialog(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'İade onaylanırken hata oluştu.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.put(`/admin/refunds/${id}/reject`, { admin_note: adminNote }),
    onSuccess: () => {
      toast.success('İade talebi reddedildi.');
      queryClient.invalidateQueries({ queryKey: ['admin-refund', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      setShowRejectDialog(false);
      setAdminNote('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'İade reddedilirken hata oluştu.');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-secondary-100" />
        <div className="h-64 animate-pulse rounded-xl bg-secondary-100" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-secondary-500">
        İade talebi bulunamadı.
      </div>
    );
  }

  const refund = data;
  const order = refund.order;
  const customer = refund.customer;
  const statusConf = refundStatusConfig[refund.status] ?? refundStatusConfig.pending;
  const StatusIcon = statusConf.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/refunds')}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-secondary-200 text-secondary-500 hover:bg-secondary-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-secondary-900">
            İade Talebi #{refund.id}
          </h1>
          <p className="text-sm text-secondary-500">
            {new Date(refund.created_at).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <Badge variant={statusConf.variant} className="text-sm px-3 py-1">
          <StatusIcon className="mr-1.5 h-4 w-4" />
          {statusConf.label}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left - Main info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Refund details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                İade Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-secondary-400 uppercase tracking-wide">Sipariş No</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-secondary-900">
                    {order?.orderNumber ?? '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-secondary-400 uppercase tracking-wide">İade Tutarı</p>
                  <p className="mt-1 text-lg font-bold text-secondary-900">
                    {formatPrice(refund.refund_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-secondary-400 uppercase tracking-wide">Ödeme Yöntemi</p>
                  <p className="mt-1 text-sm text-secondary-700">
                    {paymentMethodLabel[order?.paymentMethod ?? ''] ?? order?.paymentMethod ?? '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-secondary-400 uppercase tracking-wide">Sipariş Durumu</p>
                  <p className="mt-1 text-sm text-secondary-700 capitalize">
                    {order?.status ?? '-'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-secondary-400 uppercase tracking-wide">İade Sebebi</p>
                <p className="mt-1 text-sm font-medium text-secondary-900">{refund.reason}</p>
              </div>

              {refund.description && (
                <div>
                  <p className="text-xs font-medium text-secondary-400 uppercase tracking-wide">Ek Açıklama</p>
                  <p className="mt-1 text-sm text-secondary-700">{refund.description}</p>
                </div>
              )}

              {refund.images && refund.images.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-secondary-400 uppercase tracking-wide">Fotoğraflar</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {refund.images.map((img: string, i: number) => (
                      <a
                        key={i}
                        href={`/storage/${img}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative h-24 w-24 overflow-hidden rounded-lg border border-secondary-200 hover:opacity-80 transition-opacity"
                      >
                        <Image src={`/storage/${img}`} alt={`İade fotoğraf ${i + 1}`} fill className="object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {refund.admin_note && (
                <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-3">
                  <p className="text-xs font-medium text-secondary-400 uppercase tracking-wide">Admin Notu</p>
                  <p className="mt-1 text-sm text-secondary-700">{refund.admin_note}</p>
                </div>
              )}

              {refund.paytr_reference && (
                <div>
                  <p className="text-xs font-medium text-secondary-400 uppercase tracking-wide">PayTR Referans</p>
                  <p className="mt-1 font-mono text-sm text-secondary-700">{refund.paytr_reference}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order items */}
          {order?.items && order.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Sipariş Ürünleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg border border-secondary-100 p-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-secondary-100 bg-white">
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt={item.productName} width={56} height={56} className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-5 w-5 text-secondary-200" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-secondary-900">{item.productName}</p>
                        <p className="text-xs text-secondary-500">{item.quantity} adet x {formatPrice(item.unitPrice)}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-secondary-900">
                        {formatPrice(item.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-4 flex flex-col items-end gap-1 text-sm border-t border-secondary-100 pt-4">
                  <div className="flex gap-8">
                    <span className="text-secondary-500">Ara Toplam</span>
                    <span className="text-secondary-700">{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex gap-8">
                    <span className="text-secondary-500">Kargo</span>
                    <span className="text-secondary-700">{formatPrice(order.shippingCost)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex gap-8">
                      <span className="text-secondary-500">İndirim</span>
                      <span className="text-red-600">-{formatPrice(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex gap-8 border-t border-secondary-200 pt-1 mt-1">
                    <span className="font-semibold text-secondary-900">Toplam</span>
                    <span className="font-bold text-secondary-900">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Customer info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Müşteri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-semibold text-secondary-900">{customer?.name ?? '-'}</p>
              <p className="text-sm text-secondary-600">{customer?.email ?? '-'}</p>
              {customer?.phone && (
                <p className="text-sm text-secondary-600">{customer.phone}</p>
              )}
            </CardContent>
          </Card>

          {/* Shipping address */}
          {order?.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Teslimat Adresi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-secondary-900">
                  {order.shippingAddress.full_name}
                </p>
                <p className="mt-1 text-sm text-secondary-600">{order.shippingAddress.phone}</p>
                <p className="mt-1 text-sm text-secondary-600">
                  {order.shippingAddress.address_line}
                  {order.shippingAddress.neighborhood && `, ${order.shippingAddress.neighborhood}`}
                </p>
                <p className="text-sm text-secondary-600">
                  {order.shippingAddress.district}/{order.shippingAddress.city}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {refund.status === 'pending' && (
            <Card>
              <CardHeader>
                <CardTitle>İşlemler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setShowApproveDialog(true)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Onayla
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => setShowRejectDialog(true)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reddet
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Approve Dialog */}
      <Dialog isOpen={showApproveDialog} onClose={() => setShowApproveDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İade Talebini Onayla</DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz.
              {order?.paymentMethod === 'credit_card'
                ? ' PayTR üzerinden otomatik iade işlemi başlatılacaktır.'
                : ' İade tutarının müşteriye manuel olarak ödenmesi gerekmektedir.'}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-4">
            <div className="flex justify-between">
              <span className="text-sm text-secondary-600">İade Tutarı</span>
              <span className="text-sm font-bold text-secondary-900">{formatPrice(refund.refund_amount)}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-sm text-secondary-600">Ödeme Yöntemi</span>
              <span className="text-sm text-secondary-900">
                {paymentMethodLabel[order?.paymentMethod ?? ''] ?? order?.paymentMethod ?? '-'}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              İptal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => approveMutation.mutate()}
              loading={approveMutation.isPending}
            >
              {approveMutation.isPending ? 'Onaylanıyor...' : 'Onayla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog isOpen={showRejectDialog} onClose={() => setShowRejectDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İade Talebini Reddet</DialogTitle>
            <DialogDescription>
              Red sebebini müşteriye bildirilmek üzere yazınız.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            label="Red Sebebi"
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            rows={3}
            placeholder="İade talebinin reddedilme sebebini yazınız..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setAdminNote(''); }}>
              İptal
            </Button>
            <Button
              variant="danger"
              onClick={() => rejectMutation.mutate()}
              loading={rejectMutation.isPending}
              disabled={!adminNote.trim()}
            >
              {rejectMutation.isPending ? 'Reddediliyor...' : 'Reddet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
