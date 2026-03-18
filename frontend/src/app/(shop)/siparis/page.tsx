'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, CreditCard, Plus, ShoppingBag, Truck, Banknote, Building2 } from 'lucide-react';
import { useCustomerAuthStore } from '@/store/customer-auth';
import { useCartStore } from '@/store/cart';
import { useSettings } from '@/hooks/useSettings';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getSessionId } from '@/lib/session';
import CreditCardForm, { type CardFormData } from '@/components/shop/checkout/CreditCardForm';
import type { Address } from '@/types/api';

export default function CheckoutPage() {
  const router = useRouter();
  const { customer, token } = useCustomerAuthStore();
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const clearCart = useCartStore((s) => s.clearCart);
  const syncWithServer = useCartStore((s) => s.syncWithServer);

  // Zustand persist hydration: store starts with null before localStorage is read
  const [storeReady, setStoreReady] = useState(false);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash_on_delivery' | 'bank_transfer' | 'credit_card' | ''>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(true);

  // Credit card form state
  const [cardFormData, setCardFormData] = useState<CardFormData | null>(null);
  const [cardFormValid, setCardFormValid] = useState(false);

  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // New address dialog
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [newAddress, setNewAddress] = useState({
    title: '', full_name: '', phone: '', city: '', district: '',
    neighborhood: '', address_line: '', postal_code: '', is_default: false,
  });
  const [savingAddress, setSavingAddress] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  // Wait for zustand persist hydration before making auth decisions
  useEffect(() => {
    if (useCustomerAuthStore.persist.hasHydrated()) {
      setStoreReady(true);
      return;
    }
    const unsub = useCustomerAuthStore.persist.onFinishHydration(() => setStoreReady(true));
    return unsub;
  }, []);

  const fetchAddresses = useCallback(async () => {
    try {
      const { data } = await api.get('/customer/addresses', { headers: { Authorization: `Bearer ${token}` } });
      const list = data.data as Address[];
      setAddresses(list);
      const def = list.find((a) => a.is_default) || list[0];
      if (def) setSelectedAddressId(def.id);
    } catch {
      toast.error('Adresler yüklenirken hata oluştu.');
    } finally {
      setAddressLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!storeReady) return;
    if (!customer || !token) {
      router.replace('/giris?redirect=/siparis');
      return;
    }
    syncWithServer();
    fetchAddresses();
  }, [storeReady, customer, token, router, syncWithServer, fetchAddresses]);

  useEffect(() => {
    if (customer && items.length === 0 && !loading) {
      const timer = setTimeout(() => {
        if (useCartStore.getState().items.length === 0) {
          router.replace('/sepet');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [customer, items.length, loading, router]);

  const handleCardDataChange = useCallback((data: CardFormData, isValid: boolean) => {
    setCardFormData(data);
    setCardFormValid(isValid);
  }, []);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddress(true);
    try {
      const { data } = await api.post('/customer/addresses', newAddress, { headers: authHeaders });
      const addr = data.data as Address;
      setAddresses((prev) => [...prev, addr]);
      setSelectedAddressId(addr.id);
      setShowAddressDialog(false);
      setNewAddress({ title: '', full_name: '', phone: '', city: '', district: '', neighborhood: '', address_line: '', postal_code: '', is_default: false });
      toast.success('Adres eklendi.');
    } catch {
      toast.error('Adres eklenemedi.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error('Lütfen bir teslimat adresi seçin.');
      return;
    }

    if (paymentMethod === 'credit_card' && !cardFormValid) {
      toast.error('Lütfen kart bilgilerinizi eksiksiz girin.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create order
      const { data } = await api.post(
        '/customer/orders',
        { address_id: selectedAddressId, payment_method: paymentMethod, notes: notes || null },
        { headers: { ...authHeaders, 'X-Session-Id': getSessionId() } },
      );
      clearCart();
      const orderId = data.data?.id;
      const orderNumber = data.data?.orderNumber || '';

      if (paymentMethod === 'credit_card' && orderId && cardFormData) {
        // Step 2: Process payment with card data
        setPaymentProcessing(true);
        try {
          const payRes = await api.post(
            `/customer/orders/${orderId}/pay`,
            cardFormData,
            { headers: authHeaders },
          );

          if (payRes.data.type === '3d_secure') {
            // Write 3D Secure HTML directly to page (full-page redirect)
            document.open();
            document.write(payRes.data.html);
            document.close();
            return;
          } else if (payRes.data.type === 'success') {
            router.push(`/siparis/onay?order=${orderNumber}&payment=credit_card`);
          }
        } catch (payErr: unknown) {
          const payError = payErr as { response?: { data?: { message?: string } } };
          toast.error(payError.response?.data?.message || 'Ödeme işlemi başarısız oldu.');
          router.push(`/siparis/onay?order=${orderNumber}&payment=credit_card&status=failed`);
        } finally {
          setPaymentProcessing(false);
        }
      } else {
        router.push(`/siparis/onay?order=${orderNumber}&payment=${paymentMethod}`);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const errors = error.response?.data?.errors;
      if (errors) {
        const msg = Object.values(errors).flat().join(' ');
        toast.error(msg);
      } else {
        toast.error(error.response?.data?.message || 'Sipariş oluşturulamadı.');
      }
    } finally {
      setLoading(false);
    }
  };

  const settings = useSettings();
  const freeShippingLimit = parseFloat(settings.shipping?.free_shipping_limit ?? '500');
  const defaultShippingCost = parseFloat(settings.shipping?.default_shipping_cost ?? '0');
  const codEnabled = settings.payment?.cash_on_delivery_enabled === 'true';
  const havaleEnabled = settings.payment?.bank_transfer_enabled === 'true';
  const havaleRate = parseFloat(settings.payment?.havale_discount_rate ?? '0');
  const creditCardEnabled = settings.payment?.credit_card_enabled === 'true';

  // İlk açık olan ödeme yöntemini varsayılan yap
  useEffect(() => {
    if (paymentMethod === '') {
      if (creditCardEnabled) setPaymentMethod('credit_card');
      else if (havaleEnabled) setPaymentMethod('bank_transfer');
      else if (codEnabled) setPaymentMethod('cash_on_delivery');
    }
  }, [codEnabled, havaleEnabled, creditCardEnabled, paymentMethod]);

  if (!storeReady || !customer) return null;

  const subtotal = totalPrice();
  const shippingFree = subtotal >= freeShippingLimit;
  const shippingCost = shippingFree ? 0 : defaultShippingCost;
  const isHavale = paymentMethod === 'bank_transfer';
  const havaleDiscount = isHavale && havaleEnabled && havaleRate > 0
    ? subtotal * (havaleRate / 100)
    : 0;
  const total = subtotal + shippingCost - havaleDiscount;

  // Undiscounted total for installment calculation (comparePrice when available)
  const undiscountedSubtotal = items.reduce(
    (sum, item) => sum + (item.comparePrice && item.comparePrice > item.price ? item.comparePrice : item.price) * item.quantity,
    0,
  );
  const undiscountedTotal = undiscountedSubtotal + shippingCost;
  const installmentSavings = undiscountedTotal - total;

  // When installment is selected, charge undiscounted total
  const isInstallment = paymentMethod === 'credit_card' && cardFormData && cardFormData.installment_count > 0;
  const displayTotal = isInstallment ? undiscountedTotal : total;

  const isButtonDisabled =
    !selectedAddressId ||
    items.length === 0 ||
    paymentMethod === '' ||
    (paymentMethod === 'credit_card' && !cardFormValid);

  return (
    <div className="container-main py-6">
      <h1 className="text-2xl font-bold text-secondary-900">Sipariş Oluştur</h1>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Left: Address + Payment */}
        <div className="flex-1 space-y-6">
          {/* Address Selection */}
          <div className="rounded-xl border border-secondary-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-secondary-900">
                <MapPin className="h-5 w-5 text-primary-600" />
                Teslimat Adresi
              </h2>
              <Button variant="outline" size="sm" onClick={() => setShowAddressDialog(true)}>
                <Plus className="h-4 w-4" />
                Yeni Adres
              </Button>
            </div>

            {addressLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg bg-secondary-100" />
                ))}
              </div>
            ) : addresses.length === 0 ? (
              <p className="text-sm text-secondary-500">
                Henüz adres eklemediniz. Lütfen yeni bir adres ekleyin.
              </p>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                      selectedAddressId === addr.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-secondary-200 hover:border-secondary-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="mt-1 h-4 w-4 text-primary-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-secondary-900">{addr.title}</span>
                        {addr.is_default && <Badge variant="info">Varsayılan</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-secondary-600">
                        {addr.full_name} - {addr.phone}
                      </p>
                      <p className="text-sm text-secondary-500">
                        {addr.address_line}, {addr.neighborhood && `${addr.neighborhood}, `}
                        {addr.district}/{addr.city}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="rounded-xl border border-secondary-200 bg-white p-5">
            <h2 className="flex items-center gap-2 mb-4 text-lg font-bold text-secondary-900">
              <CreditCard className="h-5 w-5 text-primary-600" />
              Ödeme Yöntemi
            </h2>
            <div className="space-y-3">
              {codEnabled && (
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                    paymentMethod === 'cash_on_delivery'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-secondary-200 hover:border-secondary-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'cash_on_delivery'}
                    onChange={() => setPaymentMethod('cash_on_delivery')}
                    className="h-4 w-4 text-primary-600"
                  />
                  <Banknote className="h-5 w-5 text-secondary-500" />
                  <div>
                    <span className="font-medium text-secondary-900">Kapıda Ödeme</span>
                    <p className="text-sm text-secondary-500">Siparişiniz teslimatında nakit veya kart ile ödeyin</p>
                  </div>
                </label>
              )}
              {havaleEnabled && (
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-secondary-200 hover:border-secondary-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={() => setPaymentMethod('bank_transfer')}
                    className="h-4 w-4 text-primary-600"
                  />
                  <Building2 className="h-5 w-5 text-secondary-500" />
                  <div>
                    <span className="font-medium text-secondary-900">Havale / EFT</span>
                    <p className="text-sm text-secondary-500">
                      Banka havalesi ile ödeme yapın
                      {havaleRate > 0 && (
                        <span className="ml-1 font-semibold" style={{ color: '#B87333' }}>(%{havaleRate} indirim)</span>
                      )}
                    </p>
                  </div>
                </label>
              )}
              {creditCardEnabled && (
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                    paymentMethod === 'credit_card'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-secondary-200 hover:border-secondary-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'credit_card'}
                    onChange={() => setPaymentMethod('credit_card')}
                    className="h-4 w-4 text-primary-600"
                  />
                  <CreditCard className="h-5 w-5 text-secondary-500" />
                  <div>
                    <span className="font-medium text-secondary-900">Kredi / Banka Kartı</span>
                    <p className="text-sm text-secondary-500">Kredi veya banka kartınız ile güvenli ödeme yapın</p>
                  </div>
                </label>
              )}
            </div>

            {/* Inline Credit Card Form */}
            {paymentMethod === 'credit_card' && creditCardEnabled && (
              <div className="mt-4 rounded-lg border border-secondary-200 bg-secondary-50/50 p-4">
                <CreditCardForm orderTotal={total} installmentTotal={undiscountedTotal} installmentSavings={installmentSavings} onCardDataChange={handleCardDataChange} />
              </div>
            )}
          </div>

          {/* Order Notes */}
          <div className="rounded-xl border border-secondary-200 bg-white p-5">
            <Textarea
              label="Sipariş Notu (Opsiyonel)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Siparişleriniz için özel bir notunuz varsa yazabilirsiniz..."
              textareaSize="sm"
            />
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="w-full lg:w-96">
          <div className="sticky top-32 rounded-xl border border-secondary-200 bg-white p-5">
            <h2 className="text-lg font-bold text-secondary-900">Sipariş Özeti</h2>

            <div className="mt-4 max-h-64 space-y-3 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-secondary-50">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-secondary-300">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-secondary-900 line-clamp-1">{item.name}</p>
                    <p className="text-xs text-secondary-500">{item.quantity} adet</p>
                  </div>
                  <span className="text-sm font-medium text-secondary-900 whitespace-nowrap">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t border-secondary-100 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary-600">Ara Toplam</span>
                <span className="font-medium text-secondary-900">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1 text-secondary-600">
                  <Truck className="h-3.5 w-3.5" /> Kargo
                </span>
                <span className="font-medium text-secondary-900">
                  {shippingFree ? (
                    <span className="text-success">Ücretsiz</span>
                  ) : (
                    formatPrice(shippingCost)
                  )}
                </span>
              </div>
              {havaleDiscount > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: '#B87333' }}>Havale İndirimi (%{havaleRate})</span>
                  <span className="font-medium" style={{ color: '#B87333' }}>-{formatPrice(havaleDiscount)}</span>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2 border-t border-secondary-100 pt-4">
              {isInstallment && installmentSavings > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-600">İndirimli Fiyat</span>
                    <span className="font-medium text-secondary-400 line-through">{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-600">Taksitli Fiyat (Liste Fiyatı)</span>
                    <span className="font-medium text-secondary-900">{formatPrice(undiscountedTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-600">{cardFormData!.installment_count} Taksit x</span>
                    <span className="font-medium text-secondary-900">{formatPrice(undiscountedTotal / cardFormData!.installment_count)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="font-bold text-secondary-900">Toplam</span>
                <span className="text-lg font-bold text-primary-600">{formatPrice(displayTotal)}</span>
              </div>
            </div>

            <Button
              className="mt-4 w-full"
              size="lg"
              onClick={handlePlaceOrder}
              loading={loading || paymentProcessing}
              disabled={isButtonDisabled}
            >
              {paymentProcessing ? 'Ödeme İşleniyor...' : 'Siparişi Onayla'}
            </Button>

            <Link href="/sepet" className="mt-3 block text-center text-sm text-secondary-500 hover:text-primary-600">
              Sepete Dön
            </Link>
          </div>
        </div>
      </div>

      {/* New Address Dialog */}
      <Dialog isOpen={showAddressDialog} onClose={() => setShowAddressDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Adres Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAddress} className="space-y-3">
            <Input
              label="Adres Başlığı"
              value={newAddress.title}
              onChange={(e) => setNewAddress((p) => ({ ...p, title: e.target.value }))}
              required
              placeholder="Ev, İş, vb."
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ad Soyad"
                value={newAddress.full_name}
                onChange={(e) => setNewAddress((p) => ({ ...p, full_name: e.target.value }))}
                required
              />
              <Input
                label="Telefon"
                value={newAddress.phone}
                onChange={(e) => setNewAddress((p) => ({ ...p, phone: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="İl"
                value={newAddress.city}
                onChange={(e) => setNewAddress((p) => ({ ...p, city: e.target.value }))}
                required
              />
              <Input
                label="İlçe"
                value={newAddress.district}
                onChange={(e) => setNewAddress((p) => ({ ...p, district: e.target.value }))}
                required
              />
            </div>
            <Input
              label="Mahalle"
              value={newAddress.neighborhood}
              onChange={(e) => setNewAddress((p) => ({ ...p, neighborhood: e.target.value }))}
            />
            <Textarea
              label="Adres Satırı"
              value={newAddress.address_line}
              onChange={(e) => setNewAddress((p) => ({ ...p, address_line: e.target.value }))}
              required
              textareaSize="sm"
            />
            <Input
              label="Posta Kodu"
              value={newAddress.postal_code}
              onChange={(e) => setNewAddress((p) => ({ ...p, postal_code: e.target.value }))}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddressDialog(false)}>
                İptal
              </Button>
              <Button type="submit" loading={savingAddress}>
                Kaydet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
