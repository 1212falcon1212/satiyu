'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, ChevronDown, ChevronUp, ShoppingBag, Copy, Landmark, Upload, CheckCircle, Clock, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { useCustomerAuthStore } from '@/store/customer-auth';
import { useSettings } from '@/hooks/useSettings';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Order, RefundRequest } from '@/types/api';

const REFUND_REASONS = [
  'Ürün hasarlı/kusurlu geldi',
  'Yanlış ürün gönderildi',
  'Ürün beklentilerimi karşılamadı',
  'Ürün açıklamasıyla uyuşmuyor',
  'Diğer',
];

const statusMap: Record<string, { label: string; variant: 'default' | 'info' | 'warning' | 'success' | 'danger' }> = {
  pending: { label: 'Beklemede', variant: 'warning' },
  confirmed: { label: 'Onaylandı', variant: 'info' },
  preparing: { label: 'Hazırlanıyor', variant: 'info' },
  shipped: { label: 'Kargoda', variant: 'default' },
  delivered: { label: 'Teslim Edildi', variant: 'success' },
  cancelled: { label: 'İptal Edildi', variant: 'danger' },
};

const paymentStatusMap: Record<string, { label: string; variant: 'default' | 'info' | 'warning' | 'success' | 'danger' }> = {
  pending: { label: 'Bekleniyor', variant: 'warning' },
  paid: { label: 'Ödendi', variant: 'success' },
  failed: { label: 'Başarısız', variant: 'danger' },
  refunded: { label: 'İade Edildi', variant: 'info' },
};

const refundStatusMap: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' }> = {
  pending: { label: 'Beklemede', variant: 'warning' },
  approved: { label: 'Onaylandı', variant: 'success' },
  rejected: { label: 'Reddedildi', variant: 'danger' },
};

function formatIbanDisplay(iban: string): string {
  const clean = iban.replace(/\s/g, '');
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

export default function OrdersPage() {
  const { customer, token } = useCustomerAuthStore();
  const settings = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [uploadingOrderId, setUploadingOrderId] = useState<number | null>(null);
  const [refundDialogOrderId, setRefundDialogOrderId] = useState<number | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundDescription, setRefundDescription] = useState('');
  const [refundImages, setRefundImages] = useState<File[]>([]);
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [cancelDialogOrderId, setCancelDialogOrderId] = useState<number | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const authHeaders = { Authorization: `Bearer ${token}` };

  const iban = settings.payment?.havale_iban || '';
  const accountName = settings.payment?.havale_account_name || '';
  const description = settings.payment?.havale_description || '';

  const refundDays = parseInt(settings.general?.refund_days || '14', 10);

  const fetchOrders = useCallback(async () => {
    try {
      const [ordersRes, refundsRes] = await Promise.all([
        api.get('/customer/orders', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/customer/refund-requests', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
      ]);
      setOrders(ordersRes.data.data || []);
      setRefundRequests(refundsRes.data.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (customer && token) fetchOrders();
  }, [customer, token, fetchOrders]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} kopyalandı.`);
  };

  const handleReceiptUpload = async (orderId: number, file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Sadece JPEG, PNG veya PDF dosyaları yüklenebilir.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır.');
      return;
    }

    setUploadingOrderId(orderId);
    try {
      const formData = new FormData();
      formData.append('receipt', file);
      const { data } = await api.post(`/customer/orders/${orderId}/receipt`, formData, {
        headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' },
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...data.data } : o))
      );
      toast.success('Dekont başarıyla yüklendi.');
    } catch {
      toast.error('Dekont yüklenirken bir hata oluştu.');
    } finally {
      setUploadingOrderId(null);
    }
  };

  const getRefundForOrder = (orderId: number) => {
    return refundRequests.find((r) => r.order_id === orderId);
  };

  const canRequestRefund = (order: Order) => {
    if (!['shipped', 'delivered'].includes(order.status)) return false;
    if (order.paymentStatus !== 'paid') return false;
    const orderDate = new Date(order.createdAt);
    const daysSince = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > refundDays) return false;
    const existingRefund = getRefundForOrder(order.id);
    if (existingRefund && (existingRefund.status === 'pending' || existingRefund.status === 'approved')) return false;
    return true;
  };

  const canCancelOrder = (order: Order) => {
    return ['pending', 'confirmed', 'preparing'].includes(order.status);
  };

  const handleCancelOrder = async () => {
    if (!cancelDialogOrderId) return;
    setCancellingOrder(true);
    try {
      await api.post(`/customer/orders/${cancelDialogOrderId}/cancel`, {}, { headers: authHeaders });
      toast.success('Siparişiniz iptal edildi.');
      setCancelDialogOrderId(null);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Sipariş iptal edilirken hata oluştu.');
    } finally {
      setCancellingOrder(false);
    }
  };

  const handleRefundSubmit = async () => {
    if (!refundDialogOrderId || !refundReason) return;
    setSubmittingRefund(true);
    try {
      const formData = new FormData();
      formData.append('reason', refundReason);
      if (refundDescription) formData.append('description', refundDescription);
      refundImages.forEach((file) => formData.append('images[]', file));

      await api.post(`/customer/orders/${refundDialogOrderId}/refund`, formData, {
        headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' },
      });
      toast.success('İade talebiniz başarıyla oluşturuldu.');
      setRefundDialogOrderId(null);
      setRefundReason('');
      setRefundDescription('');
      setRefundImages([]);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'İade talebi oluşturulurken hata oluştu.');
    } finally {
      setSubmittingRefund(false);
    }
  };

  if (!customer) return null;

  return (
    <div>
      <h1 className="text-xl font-bold text-secondary-900 sm:text-2xl">Siparişlerim</h1>
      <p className="mt-1 text-sm text-secondary-500">Sipariş geçmişinizi görüntüleyin ve takip edin.</p>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary-100" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-secondary-200 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary-50">
              <Package className="h-8 w-8 text-secondary-300" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-secondary-900">Henüz siparişiniz yok</h2>
            <p className="mt-1 text-sm text-secondary-500">İlk siparişinizi vermek için alışverişe başlayın.</p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            >
              <ShoppingBag className="h-4 w-4" />
              Alışverişe Başla
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const expanded = expandedId === order.id;
              const status = statusMap[order.status] || { label: order.status, variant: 'default' as const };
              const payStatus = paymentStatusMap[order.paymentStatus] || { label: order.paymentStatus, variant: 'default' as const };
              const isBankTransfer = order.paymentMethod === 'bank_transfer';
              const needsReceipt = isBankTransfer && !order.paymentReceiptUrl && order.paymentStatus !== 'paid';
              const receiptUploaded = isBankTransfer && !!order.paymentReceiptUrl && order.paymentStatus === 'pending';
              const paymentApproved = order.paymentStatus === 'paid';
              const existingRefund = getRefundForOrder(order.id);
              const showRefundButton = canRequestRefund(order);
              const showCancelButton = canCancelOrder(order);

              return (
                <div key={order.id} className="overflow-hidden rounded-xl border border-secondary-200 bg-white">
                  {/* Header row */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : order.id)}
                    className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-secondary-50/50 sm:p-5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-50">
                      <Package className="h-5 w-5 text-secondary-400" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-mono text-sm font-bold text-secondary-900">
                          {order.orderNumber}
                        </span>
                        <span className="text-xs text-secondary-400">
                          {new Date(order.createdAt).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <Badge variant={payStatus.variant}>{payStatus.label}</Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-secondary-900 sm:text-base">
                        {formatPrice(order.total)}
                      </span>
                      {expanded ? (
                        <ChevronUp className="h-4 w-4 text-secondary-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-secondary-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded details */}
                  {expanded && order.items && (
                    <div className="border-t border-secondary-100 bg-secondary-50/30 px-4 pb-5 pt-4 sm:px-5">

                      {/* Bank Transfer: IBAN Info */}
                      {isBankTransfer && !paymentApproved && iban && (
                        <div className="mb-4 rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Landmark className="h-5 w-5 text-amber-700" />
                            <h3 className="text-sm font-bold text-amber-900">Havale/EFT Bilgileri</h3>
                          </div>

                          <p className="text-xs text-amber-800 mb-3">
                            Siparişinizin onaylanması için aşağıdaki hesaba ödemenizi yapınız.
                          </p>

                          {accountName && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Hesap Sahibi</p>
                              <p className="mt-0.5 text-sm font-semibold text-secondary-900">{accountName}</p>
                            </div>
                          )}

                          <div className="mb-2">
                            <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">IBAN</p>
                            <div className="mt-1 flex items-center gap-2">
                              <code className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-mono font-semibold text-secondary-900 border border-amber-200">
                                {formatIbanDisplay(iban)}
                              </code>
                              <button
                                onClick={() => copyToClipboard(iban.replace(/\s/g, ''), 'IBAN')}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
                                title="IBAN Kopyala"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {description && (
                            <div className="mt-3 rounded-lg bg-amber-100/60 px-3 py-2">
                              <p className="text-xs font-medium text-amber-900">{description}</p>
                            </div>
                          )}

                          <div className="mt-3 flex items-center gap-2 text-xs text-amber-800">
                            <span>Sipariş Kodunuz:</span>
                            <code className="rounded bg-white px-2 py-0.5 font-mono font-semibold text-secondary-900 border border-amber-200">
                              {order.orderNumber}
                            </code>
                            <button
                              onClick={() => copyToClipboard(order.orderNumber, 'Sipariş kodu')}
                              className="text-amber-700 hover:text-amber-900"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Receipt Upload */}
                      {needsReceipt && (
                        <div className="mb-4 rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Upload className="h-4 w-4 text-amber-700" />
                            <h3 className="text-sm font-bold text-amber-900">Dekont Yükle</h3>
                          </div>
                          <p className="text-xs text-amber-800 mb-3">
                            Havale/EFT dekontunuzu yükleyerek ödeme onay sürecini başlatın. (JPEG, PNG veya PDF, max 5MB)
                          </p>
                          <input
                            ref={(el) => { fileInputRefs.current[order.id] = el; }}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleReceiptUpload(order.id, file);
                            }}
                          />
                          <button
                            onClick={() => fileInputRefs.current[order.id]?.click()}
                            disabled={uploadingOrderId === order.id}
                            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
                          >
                            {uploadingOrderId === order.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Yükleniyor...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4" />
                                Dekont Yükle
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Receipt Uploaded - Pending Review */}
                      {receiptUploaded && (
                        <div className="mb-4 rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-700" />
                            <h3 className="text-sm font-bold text-blue-900">Dekontunuz İnceleniyor</h3>
                          </div>
                          <p className="mt-1 text-xs text-blue-800">
                            Ödeme dekontunuz başarıyla yüklendi ve inceleme sürecindedir. Onaylandıktan sonra siparişiniz hazırlama aşamasına alınacaktır.
                          </p>
                        </div>
                      )}

                      {/* Payment Approved */}
                      {isBankTransfer && paymentApproved && (
                        <div className="mb-4 rounded-xl border-2 border-green-200 bg-green-50 p-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-700" />
                            <h3 className="text-sm font-bold text-green-900">Ödemeniz Onaylandı</h3>
                          </div>
                          <p className="mt-1 text-xs text-green-800">
                            Havale/EFT ödemeniz onaylandı. Siparişiniz hazırlanıyor.
                          </p>
                        </div>
                      )}

                      {/* Refund Request Status */}
                      {existingRefund && (
                        <div className={`mb-4 rounded-xl border-2 p-4 ${
                          existingRefund.status === 'pending' ? 'border-amber-200 bg-amber-50' :
                          existingRefund.status === 'approved' ? 'border-green-200 bg-green-50' :
                          'border-danger/20 bg-danger/5'
                        }`}>
                          <div className="flex items-center gap-2">
                            <RotateCcw className={`h-4 w-4 ${
                              existingRefund.status === 'pending' ? 'text-amber-700' :
                              existingRefund.status === 'approved' ? 'text-green-700' :
                              'text-danger'
                            }`} />
                            <h3 className={`text-sm font-bold ${
                              existingRefund.status === 'pending' ? 'text-amber-900' :
                              existingRefund.status === 'approved' ? 'text-green-900' :
                              'text-danger'
                            }`}>
                              İade Talebi: {refundStatusMap[existingRefund.status]?.label ?? existingRefund.status}
                            </h3>
                          </div>
                          <p className={`mt-1 text-xs ${
                            existingRefund.status === 'pending' ? 'text-amber-800' :
                            existingRefund.status === 'approved' ? 'text-green-800' :
                            'text-danger'
                          }`}>
                            {existingRefund.status === 'pending' && 'İade talebiniz inceleniyor.'}
                            {existingRefund.status === 'approved' && 'İade talebiniz onaylandı. Ödemeniz iade edilecektir.'}
                            {existingRefund.status === 'rejected' && (
                              <>İade talebiniz reddedildi.{existingRefund.admin_note && ` Sebep: ${existingRefund.admin_note}`}</>
                            )}
                          </p>
                          <p className="mt-1 text-xs text-secondary-500">
                            Sebep: {existingRefund.reason}
                          </p>
                        </div>
                      )}

                      {/* Items */}
                      <div className="space-y-3">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-secondary-100 bg-white">
                              {item.imageUrl ? (
                                <Image
                                  src={item.imageUrl}
                                  alt={item.productName}
                                  width={56}
                                  height={56}
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Package className="h-5 w-5 text-secondary-200" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-secondary-900">
                                {item.productName}
                              </p>
                              <p className="text-xs text-secondary-500">{item.quantity} adet</p>
                            </div>
                            <span className="shrink-0 text-sm font-semibold text-secondary-900">
                              {formatPrice(item.totalPrice)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Address */}
                      {order.shippingAddress && (
                        <div className="mt-4 rounded-lg border border-secondary-100 bg-white p-3">
                          <p className="text-xs font-medium text-secondary-400 uppercase tracking-wide">Teslimat Adresi</p>
                          <p className="mt-1 text-sm text-secondary-700">
                            {order.shippingAddress.full_name} - {order.shippingAddress.phone}
                          </p>
                          <p className="text-sm text-secondary-600">
                            {order.shippingAddress.address_line}
                            {order.shippingAddress.neighborhood && `, ${order.shippingAddress.neighborhood}`}
                            , {order.shippingAddress.district}/{order.shippingAddress.city}
                          </p>
                        </div>
                      )}

                      {/* Totals */}
                      <div className="mt-4 flex flex-col items-end gap-1 text-sm">
                        <div className="flex gap-8">
                          <span className="text-secondary-500">Ara Toplam</span>
                          <span className="text-secondary-700">{formatPrice(order.subtotal)}</span>
                        </div>
                        <div className="flex gap-8">
                          <span className="text-secondary-500">Kargo</span>
                          <span className="text-secondary-700">{formatPrice(order.shippingCost)}</span>
                        </div>
                        <div className="mt-1 flex gap-8 border-t border-secondary-200 pt-1">
                          <span className="font-semibold text-secondary-900">Toplam</span>
                          <span className="font-bold text-secondary-900">{formatPrice(order.total)}</span>
                        </div>
                      </div>

                      {/* Cancel / Refund Buttons */}
                      {(showCancelButton || showRefundButton) && (
                        <div className="mt-4 pt-4 border-t border-secondary-200 flex flex-wrap gap-2">
                          {showCancelButton && (
                            <button
                              onClick={() => setCancelDialogOrderId(order.id)}
                              className="inline-flex items-center gap-2 rounded-lg border border-danger/30 bg-white px-4 py-2 text-sm font-medium text-danger hover:bg-danger/5 transition-colors"
                            >
                              <XCircle className="h-4 w-4" />
                              Siparişi İptal Et
                            </button>
                          )}
                          {showRefundButton && (
                            <button
                              onClick={() => {
                                setRefundDialogOrderId(order.id);
                                setRefundReason('');
                                setRefundDescription('');
                                setRefundImages([]);
                              }}
                              className="inline-flex items-center gap-2 rounded-lg border border-secondary-300 bg-white px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50 transition-colors"
                            >
                              <RotateCcw className="h-4 w-4" />
                              İade Talebi Oluştur
                            </button>
                          )}
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

      {/* Cancel Order Dialog */}
      {cancelDialogOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setCancelDialogOrderId(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger/10">
                <XCircle className="h-5 w-5 text-danger" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-secondary-900">Siparişi İptal Et</h2>
                <p className="text-xs text-secondary-500">
                  {orders.find((o) => o.id === cancelDialogOrderId)?.orderNumber}
                </p>
              </div>
            </div>

            {(() => {
              const order = orders.find((o) => o.id === cancelDialogOrderId);
              const isPaid = order?.paymentStatus === 'paid' && order?.paymentMethod === 'credit_card';
              return (
                <p className="text-sm text-secondary-600">
                  {isPaid
                    ? 'Siparişiniz iptal edilecek ve ödemeniz kartınıza iade edilecektir. Devam etmek istiyor musunuz?'
                    : 'Siparişiniz iptal edilecektir. Devam etmek istiyor musunuz?'}
                </p>
              );
            })()}

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setCancelDialogOrderId(null)}
                className="rounded-lg border border-secondary-300 bg-white px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50 transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancellingOrder}
                className="inline-flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90 transition-colors disabled:opacity-50"
              >
                {cancellingOrder ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    İptal Ediliyor...
                  </>
                ) : (
                  'İptal Et'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Request Dialog */}
      {refundDialogOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setRefundDialogOrderId(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <RotateCcw className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-secondary-900">İade Talebi</h2>
                <p className="text-xs text-secondary-500">
                  Sipariş: {orders.find((o) => o.id === refundDialogOrderId)?.orderNumber}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-secondary-700">
                  İade Sebebi <span className="text-danger">*</span>
                </label>
                <div className="space-y-2">
                  {REFUND_REASONS.map((reason) => (
                    <label key={reason} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="refund-reason"
                        value={reason}
                        checked={refundReason === reason}
                        onChange={() => setRefundReason(reason)}
                        className="h-4 w-4 text-primary-600 border-secondary-300 focus:ring-primary-500"
                      />
                      <span className="text-sm text-secondary-700">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-secondary-700">
                  Ek Açıklama (Opsiyonel)
                </label>
                <textarea
                  value={refundDescription}
                  onChange={(e) => setRefundDescription(e.target.value)}
                  rows={3}
                  placeholder="İade sebebinizi detaylandırabilirsiniz..."
                  className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm text-secondary-900 placeholder:text-secondary-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-secondary-700">
                  Fotoğraf Ekle (Opsiyonel, max 5)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).slice(0, 5);
                    setRefundImages(files);
                  }}
                  className="w-full text-sm text-secondary-700 file:mr-3 file:rounded-lg file:border-0 file:bg-secondary-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-700 hover:file:bg-secondary-200"
                />
                {refundImages.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {refundImages.map((file, i) => (
                      <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-secondary-200">
                        <Image
                          src={URL.createObjectURL(file)}
                          alt={`Fotoğraf ${i + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setRefundDialogOrderId(null)}
                className="rounded-lg border border-secondary-300 bg-white px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleRefundSubmit}
                disabled={!refundReason || submittingRefund}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {submittingRefund ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  'Gönder'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
