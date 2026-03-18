'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Truck,
  CreditCard,
  MapPin,
  User,
  Clock,
  XCircle,
  AlertTriangle,
  ShoppingBag,
  Hash,
  FileText,
  CheckCircle,
  ExternalLink,
  Download,
  ImageIcon,
} from 'lucide-react';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
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
import type { Order } from '@/types/api';

const statusOptions = [
  { value: 'pending', label: 'Beklemede' },
  { value: 'confirmed', label: 'Onaylandı' },
  { value: 'preparing', label: 'Hazırlanıyor' },
  { value: 'shipped', label: 'Kargoda' },
  { value: 'delivered', label: 'Teslim Edildi' },
  { value: 'cancelled', label: 'İptal Edildi' },
];

const statusConfig: Record<string, { label: string; variant: 'default' | 'info' | 'warning' | 'success' | 'danger'; icon: typeof Package }> = {
  pending: { label: 'Beklemede', variant: 'warning', icon: Clock },
  confirmed: { label: 'Onaylandı', variant: 'info', icon: Package },
  preparing: { label: 'Hazırlanıyor', variant: 'info', icon: Package },
  shipped: { label: 'Kargoda', variant: 'default', icon: Truck },
  delivered: { label: 'Teslim Edildi', variant: 'success', icon: Package },
  cancelled: { label: 'İptal Edildi', variant: 'danger', icon: XCircle },
};

const paymentBadge: Record<string, { label: string; variant: 'default' | 'info' | 'warning' | 'success' | 'danger' }> = {
  pending: { label: 'Bekleniyor', variant: 'warning' },
  paid: { label: 'Ödendi', variant: 'success' },
  failed: { label: 'Başarısız', variant: 'danger' },
  refunded: { label: 'İade', variant: 'info' },
};

const paymentMethodLabel: Record<string, string> = {
  cash_on_delivery: 'Kapıda Ödeme',
  bank_transfer: 'Havale / EFT',
  credit_card: 'Kredi / Banka Kartı',
};

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['admin-order', id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/orders/${id}`);
      return data.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (status: string) => api.put(`/admin/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Sipariş durumu güncellendi.');
      setNewStatus('');
    },
    onError: () => toast.error('Durum güncellenemedi.'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.put(`/admin/orders/${id}/status`, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Sipariş iptal edildi. Stoklar geri yüklendi.');
      setShowCancelDialog(false);
    },
    onError: () => toast.error('Sipariş iptal edilemedi.'),
  });

  const approveMutation = useMutation({
    mutationFn: () => api.put(`/admin/orders/${id}/approve-payment`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Ödeme onaylandı, sipariş onaylandı.');
      setShowApproveDialog(false);
    },
    onError: () => toast.error('Ödeme onaylanamadı.'),
  });

  const handleUpdateStatus = () => {
    if (!newStatus) return;
    if (newStatus === 'cancelled') {
      setShowCancelDialog(true);
      return;
    }
    updateMutation.mutate(newStatus);
  };

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
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-secondary-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!order) return <p className="text-secondary-500">Sipariş bulunamadı.</p>;

  const sc = statusConfig[order.status] || { label: order.status, variant: 'default' as const, icon: Package };
  const ps = paymentBadge[order.paymentStatus] || { label: order.paymentStatus, variant: 'default' as const };
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const canCancel = !isCancelled && !isDelivered;

  return (
    <div>
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push('/admin/orders')}
        className="mb-4 flex items-center gap-2 text-sm text-secondary-500 hover:text-secondary-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Siparişlere Dön
      </button>

      {/* Header bar */}
      <div className="mb-6 rounded-xl border border-secondary-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
              <ShoppingBag className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-secondary-900">{order.orderNumber}</h1>
                <Badge variant={sc.variant}>{sc.label}</Badge>
                <Badge variant={ps.variant}>{ps.label}</Badge>
              </div>
              <p className="mt-0.5 text-sm text-secondary-500">
                {new Date(order.createdAt).toLocaleString('tr-TR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
                className="border-danger/30 text-danger hover:bg-danger/5"
              >
                <XCircle className="h-4 w-4" />
                Siparişi İptal Et
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order items with images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-secondary-400" />
                Sipariş İçeriği ({order.items?.length || 0} ürün)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-secondary-100">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    {/* Product image */}
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-secondary-100 bg-secondary-50">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.productName}
                          fill
                          className="object-contain p-1"
                          sizes="80px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-6 w-6 text-secondary-300" />
                        </div>
                      )}
                    </div>

                    {/* Product info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {item.productSlug ? (
                            <Link
                              href={`/admin/products/${item.productId}`}
                              className="text-sm font-medium text-secondary-900 hover:text-primary-600 transition-colors line-clamp-2"
                            >
                              {item.productName}
                            </Link>
                          ) : (
                            <p className="text-sm font-medium text-secondary-900 line-clamp-2">
                              {item.productName}
                            </p>
                          )}

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {item.sku && (
                              <span className="flex items-center gap-1 text-xs text-secondary-400">
                                <Hash className="h-3 w-3" />
                                {item.sku}
                              </span>
                            )}
                            {item.variantInfo && (Array.isArray(item.variantInfo)
                              ? item.variantInfo.map((vi: { type: string; value: string }, idx: number) => (
                                  <span
                                    key={idx}
                                    className="rounded-md bg-secondary-100 px-2 py-0.5 text-xs font-medium text-secondary-600"
                                  >
                                    {vi.type}: {vi.value}
                                  </span>
                                ))
                              : Object.entries(item.variantInfo).map(([k, v]) => (
                                  <span
                                    key={k}
                                    className="rounded-md bg-secondary-100 px-2 py-0.5 text-xs font-medium text-secondary-600"
                                  >
                                    {k}: {String(v)}
                                  </span>
                                ))
                            )}
                          </div>
                        </div>

                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm font-bold text-secondary-900">
                            {formatPrice(item.totalPrice)}
                          </p>
                          {item.quantity > 1 && (
                            <p className="mt-0.5 text-xs text-secondary-400">
                              {item.quantity} x {formatPrice(item.unitPrice)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 border-t border-secondary-200 pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary-500">Ara Toplam</span>
                    <span className="text-secondary-900">{formatPrice(order.subtotal)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-secondary-500">İndirim</span>
                      <span className="font-medium text-success">-{formatPrice(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-secondary-500">Kargo</span>
                    <span className="text-secondary-900">
                      {order.shippingCost > 0 ? formatPrice(order.shippingCost) : 'Ücretsiz'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-secondary-100 pt-2">
                    <span className="text-base font-bold text-secondary-900">Toplam</span>
                    <span className="text-base font-bold text-primary-600">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status update */}
          {!isCancelled && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-secondary-400" />
                  Durum Güncelle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Select
                      options={statusOptions}
                      value={newStatus || order.status}
                      onChange={(e) => setNewStatus(e.target.value)}
                      label="Yeni Durum"
                    />
                  </div>
                  <Button
                    onClick={handleUpdateStatus}
                    loading={updateMutation.isPending}
                    disabled={!newStatus || newStatus === order.status}
                  >
                    Güncelle
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-secondary-400" />
                  Sipariş Notu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-secondary-600 leading-relaxed">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-secondary-400" />
                Müşteri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-secondary-900">{order.customer?.name || '-'}</p>
                {order.customer?.email && (
                  <p className="text-secondary-500">{order.customer.email}</p>
                )}
                {order.customer?.phone && (
                  <p className="text-secondary-500">{order.customer.phone}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-secondary-400" />
                Teslimat Adresi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.shippingAddress ? (
                <div className="space-y-1.5 text-sm">
                  <p className="font-medium text-secondary-900">
                    {order.shippingAddress.full_name}
                  </p>
                  <p className="text-secondary-500">{order.shippingAddress.phone}</p>
                  <p className="text-secondary-600 leading-relaxed">
                    {order.shippingAddress.address_line}
                    {order.shippingAddress.neighborhood && `, ${order.shippingAddress.neighborhood}`}
                  </p>
                  <p className="text-secondary-600">
                    {order.shippingAddress.district}/{order.shippingAddress.city}
                    {order.shippingAddress.postal_code && ` - ${order.shippingAddress.postal_code}`}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-secondary-400">Adres bilgisi yok</p>
              )}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-secondary-400" />
                Ödeme Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-secondary-500">Yöntem</span>
                  <span className="font-medium text-secondary-900">
                    {paymentMethodLabel[order.paymentMethod] || order.paymentMethod}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-500">Durum</span>
                  <Badge variant={ps.variant}>{ps.label}</Badge>
                </div>
                <div className="flex items-center justify-between border-t border-secondary-100 pt-3">
                  <span className="font-bold text-secondary-900">Toplam</span>
                  <span className="text-lg font-bold text-primary-600">{formatPrice(order.total)}</span>
                </div>

                {/* Receipt Display */}
                {order.paymentReceiptUrl && (
                  <div className="border-t border-secondary-100 pt-3">
                    <p className="text-xs font-medium text-secondary-400 uppercase tracking-wide mb-2">Ödeme Dekontu</p>
                    {order.paymentReceiptUrl.match(/\.(jpeg|jpg|png)$/i) ? (
                      <div className="space-y-2">
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-secondary-200 bg-secondary-50">
                          <Image
                            src={order.paymentReceiptUrl}
                            alt="Ödeme dekontu"
                            fill
                            className="object-contain p-1"
                            sizes="300px"
                          />
                        </div>
                        <a
                          href={order.paymentReceiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Yeni sekmede aç
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-lg border border-secondary-200 bg-secondary-50 p-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                          <FileText className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-secondary-900">PDF Dekont</p>
                          <p className="text-xs text-secondary-500">Dosyayı indirmek veya görüntülemek için tıklayın</p>
                        </div>
                        <a
                          href={order.paymentReceiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-secondary-200 text-secondary-600 hover:bg-secondary-50 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Approve Payment Button */}
                {order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'pending' && order.paymentReceiptUrl && (
                  <div className="border-t border-secondary-100 pt-3">
                    <Button
                      onClick={() => setShowApproveDialog(true)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Ödemeyi Onayla
                    </Button>
                  </div>
                )}

                {/* No receipt warning */}
                {order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'pending' && !order.paymentReceiptUrl && (
                  <div className="border-t border-secondary-100 pt-3">
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <p className="text-xs text-amber-800">Müşteri henüz dekont yüklemedi.</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approve payment dialog */}
      <Dialog isOpen={showApproveDialog} onClose={() => setShowApproveDialog(false)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Ödemeyi Onayla
          </DialogTitle>
          <DialogDescription>
            Ödeme onaylandığında sipariş durumu &quot;Onaylandı&quot; olarak güncellenecek.
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <p className="text-sm text-secondary-700">
              <strong>{order.orderNumber}</strong> numaralı siparişin havale/EFT ödemesini onaylamak istediğinize emin misiniz?
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-secondary-600">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                Ödeme durumu &quot;Ödendi&quot; olarak güncellenecek
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                Sipariş durumu &quot;Onaylandı&quot; olarak güncellenecek
              </li>
            </ul>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowApproveDialog(false)}
            disabled={approveMutation.isPending}
          >
            Vazgeç
          </Button>
          <Button
            onClick={() => approveMutation.mutate()}
            loading={approveMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-4 w-4" />
            Evet, Ödemeyi Onayla
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Cancel confirmation dialog */}
      <Dialog isOpen={showCancelDialog} onClose={() => setShowCancelDialog(false)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-danger" />
            Siparişi İptal Et
          </DialogTitle>
          <DialogDescription>
            Bu işlemi geri alamazsınız.
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          <div className="rounded-lg bg-danger/5 border border-danger/20 p-4">
            <p className="text-sm text-secondary-700">
              <strong>{order.orderNumber}</strong> numaralı siparişi iptal etmek üzeresiniz.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-secondary-600">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-danger" />
                Sipariş durumu &quot;İptal Edildi&quot; olarak güncellenecek
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-danger" />
                Ürün stokları otomatik olarak geri yüklenecek
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-danger" />
                Müşteriye bilgilendirme yapmaniz gerekebilir
              </li>
            </ul>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowCancelDialog(false)}
            disabled={cancelMutation.isPending}
          >
            Vazgeç
          </Button>
          <Button
            variant="danger"
            onClick={() => cancelMutation.mutate()}
            loading={cancelMutation.isPending}
          >
            <XCircle className="h-4 w-4" />
            Evet, İptal Et
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
