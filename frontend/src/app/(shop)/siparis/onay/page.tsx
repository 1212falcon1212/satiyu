'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Package, ShoppingBag, Copy, Landmark, XCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/useSettings';

export default function OrderConfirmationPage() {
  return (
    <Suspense>
      <OrderConfirmationContent />
    </Suspense>
  );
}

function formatIbanDisplay(iban: string): string {
  const clean = iban.replace(/\s/g, '');
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order') || '';
  const paymentMethod = searchParams.get('payment') || '';
  const settings = useSettings();

  const isBankTransfer = paymentMethod === 'bank_transfer';
  const isCreditCard = paymentMethod === 'credit_card';
  const isFailed = searchParams.get('status') === 'failed';
  const iban = settings.payment?.havale_iban || '';
  const accountName = settings.payment?.havale_account_name || '';
  const description = settings.payment?.havale_description || '';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} kopyalandı.`);
  };

  return (
    <div className="container-main py-12">
      <div className="mx-auto max-w-xl text-center">
        {isCreditCard && isFailed ? (
          <>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-danger/10">
              <XCircle className="h-10 w-10 text-danger" />
            </div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Ödeme Başarısız Oldu
            </h1>
            <p className="mt-2 text-secondary-500">
              Kredi kartı ödemeniz tamamlanamadı. Lütfen tekrar deneyin veya farklı bir ödeme yöntemi seçin.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Siparişiniz Alındı!
            </h1>
            <p className="mt-2 text-secondary-500">
              {isCreditCard
                ? 'Kredi kartı ödemeniz başarıyla alındı. Siparişiniz onaylandı.'
                : 'Siparişiniz başarıyla oluşturuldu. Sipariş durumunuzu hesabınızdan takip edebilirsiniz.'}
            </p>
          </>
        )}

        {orderNumber && (
          <div className="mt-6 rounded-lg border border-secondary-200 bg-secondary-50 px-6 py-4">
            <p className="text-sm text-secondary-500">Sipariş Numarası</p>
            <p className="mt-1 text-xl font-bold text-secondary-900">{orderNumber}</p>
          </div>
        )}

        {/* Credit Card Success Info */}
        {isCreditCard && !isFailed && (
          <div className="mt-6 rounded-xl border-2 border-green-200 bg-green-50 p-6 text-left">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-5 w-5 text-green-700" />
              <h2 className="text-lg font-bold text-green-900">Kredi Kartı Ödemesi</h2>
            </div>
            <p className="text-sm text-green-800">
              Ödemeniz başarıyla alındı. Siparişiniz en kısa sürede hazırlanacaktır.
            </p>
          </div>
        )}

        {/* Credit Card Failed */}
        {isCreditCard && isFailed && (
          <div className="mt-6 rounded-xl border-2 border-danger/20 bg-danger/5 p-6 text-left">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-5 w-5 text-danger" />
              <h2 className="text-lg font-bold text-danger">Ödeme Hatası</h2>
            </div>
            <p className="text-sm text-danger/80">
              Ödemeniz işlenirken bir sorun oluştu. Kartınızdan herhangi bir tutar çekilmemiştir.
            </p>
            <Link href="/sepet" className="mt-3 inline-block text-sm font-semibold text-danger hover:text-danger/80 underline">
              Tekrar Deneyin
            </Link>
          </div>
        )}

        {/* Bank Transfer Info */}
        {isBankTransfer && iban && (
          <div className="mt-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-6 text-left">
            <div className="flex items-center gap-2 mb-4">
              <Landmark className="h-5 w-5 text-amber-700" />
              <h2 className="text-lg font-bold text-amber-900">Havale/EFT Bilgileri</h2>
            </div>

            <p className="text-sm text-amber-800 mb-4">
              Siparişinizin onaylanması için aşağıdaki hesaba ödemenizi yapınız.
            </p>

            {/* Account Name */}
            {accountName && (
              <div className="mb-3">
                <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Hesap Sahibi</p>
                <p className="mt-0.5 text-base font-semibold text-secondary-900">{accountName}</p>
              </div>
            )}

            {/* IBAN */}
            <div className="mb-3">
              <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">IBAN</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-mono font-semibold text-secondary-900 border border-amber-200">
                  {formatIbanDisplay(iban)}
                </code>
                <button
                  onClick={() => copyToClipboard(iban.replace(/\s/g, ''), 'IBAN')}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
                  title="IBAN Kopyala"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Description / Note */}
            {description && (
              <div className="mt-4 rounded-lg bg-amber-100/60 px-4 py-3">
                <p className="text-sm font-medium text-amber-900">{description}</p>
              </div>
            )}

            {/* Order number reminder */}
            {orderNumber && (
              <div className="mt-4 flex items-center gap-2 text-sm text-amber-800">
                <span>Sipariş Kodunuz:</span>
                <code className="rounded bg-white px-2 py-0.5 font-mono font-semibold text-secondary-900 border border-amber-200">
                  {orderNumber}
                </code>
                <button
                  onClick={() => copyToClipboard(orderNumber, 'Sipariş kodu')}
                  className="text-amber-700 hover:text-amber-900"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/hesabim/siparislerim">
            <Button>
              <Package className="h-4 w-4" />
              Siparişlerimi Gör
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline">
              <ShoppingBag className="h-4 w-4" />
              Alışverişe Devam Et
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
