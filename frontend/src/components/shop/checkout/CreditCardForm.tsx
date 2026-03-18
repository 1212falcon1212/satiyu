'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CreditCard, Building2, Info, ShieldCheck, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useCustomerAuthStore } from '@/store/customer-auth';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';

export interface CardFormData {
  cc_owner: string;
  card_number: string;
  expiry_month: string;
  expiry_year: string;
  cvv: string;
  installment_count: number;
  card_type: string;
  store_card: boolean;
  ctoken: string | null;
}

interface SavedCard {
  ctoken: string;
  last_4: string;
  require_cvv: number;
  month: string;
  year: string;
  c_bank: string;
  c_name: string;
  c_brand: string;
  c_type: string;
  schema: string;
}

interface BinInfo {
  brand: string;
  card_type: string;
  bank: string;
  schema: string;
}

interface InstallmentRate {
  count: number;
  rate: number;
}

interface Props {
  orderTotal: number;
  installmentTotal?: number;
  installmentSavings?: number;
  onCardDataChange: (data: CardFormData, isValid: boolean) => void;
}

export default function CreditCardForm({ orderTotal, installmentTotal, installmentSavings = 0, onCardDataChange }: Props) {
  const { token } = useCustomerAuthStore();
  const authHeaders = { Authorization: `Bearer ${token}` };

  // Saved cards
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [savedCardsLoading, setSavedCardsLoading] = useState(true);
  const [selectedCtoken, setSelectedCtoken] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);
  const [storeCard, setStoreCard] = useState(false);

  // New card fields
  const [ccOwner, setCcOwner] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [installmentCount, setInstallmentCount] = useState(0);
  const [cardType, setCardType] = useState('');

  const [binInfo, setBinInfo] = useState<BinInfo | null>(null);
  const [binLoading, setBinLoading] = useState(false);
  const [installmentRates, setInstallmentRates] = useState<Record<string, InstallmentRate[]>>({});
  const [ratesLoaded, setRatesLoaded] = useState(false);

  const binTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBinRef = useRef('');

  // Fetch saved cards
  useEffect(() => {
    const fetchSavedCards = async () => {
      try {
        const { data } = await api.get('/customer/paytr/cards', { headers: authHeaders });
        const cards = data.cards || [];
        setSavedCards(cards);
        if (cards.length > 0) {
          setSelectedCtoken(cards[0].ctoken);
          setCardType(cards[0].c_brand?.toLowerCase() || '');
          setUseNewCard(false);
        } else {
          setUseNewCard(true);
        }
      } catch {
        setUseNewCard(true);
      } finally {
        setSavedCardsLoading(false);
      }
    };
    fetchSavedCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch installment rates once
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const { data } = await api.get('/customer/paytr/installments', { headers: authHeaders });
        if (data.installment_rates) {
          setInstallmentRates(data.installment_rates);
        }
        setRatesLoaded(true);
      } catch {
        setRatesLoaded(true);
      }
    };
    fetchRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // BIN lookup with debounce
  const doBinLookup = useCallback(async (bin: string) => {
    if (bin.length < 6) {
      setBinInfo(null);
      setCardType('');
      setInstallmentCount(0);
      return;
    }

    if (bin === lastBinRef.current) return;
    lastBinRef.current = bin;

    setBinLoading(true);
    try {
      const { data } = await api.post('/customer/paytr/bin-lookup', { bin_number: bin }, { headers: authHeaders });
      if (data.success) {
        setBinInfo({ brand: data.brand, card_type: data.card_type, bank: data.bank, schema: data.schema });
        setCardType(data.brand?.toLowerCase() || '');
      } else {
        setBinInfo(null);
        setCardType('');
      }
    } catch {
      setBinInfo(null);
      setCardType('');
    } finally {
      setBinLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Card number change handler
  const handleCardNumberChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);

    if (binTimerRef.current) clearTimeout(binTimerRef.current);
    const bin = digits.slice(0, 8);
    if (digits.length >= 6) {
      binTimerRef.current = setTimeout(() => doBinLookup(bin), 500);
    } else {
      setBinInfo(null);
      setCardType('');
      lastBinRef.current = '';
    }
  };

  // Validate and notify parent
  useEffect(() => {
    if (!useNewCard && selectedCtoken) {
      // Saved card selected
      const selectedCard = savedCards.find((c) => c.ctoken === selectedCtoken);
      const needsCvv = Number(selectedCard?.require_cvv) === 1;
      const isValid = !needsCvv || cvv.length >= 3;

      onCardDataChange(
        {
          cc_owner: '',
          card_number: '',
          expiry_month: '',
          expiry_year: '',
          cvv: needsCvv ? cvv : '',
          installment_count: installmentCount,
          card_type: selectedCard?.c_brand?.toLowerCase() || cardType,
          store_card: false,
          ctoken: selectedCtoken,
        },
        isValid,
      );
    } else {
      // New card
      const digitsOnly = cardNumber.replace(/\s/g, '');
      const isValid =
        ccOwner.trim().length >= 3 &&
        digitsOnly.length >= 15 &&
        expiryMonth !== '' &&
        expiryYear !== '' &&
        cvv.length >= 3;

      onCardDataChange(
        {
          cc_owner: ccOwner,
          card_number: digitsOnly,
          expiry_month: expiryMonth,
          expiry_year: expiryYear,
          cvv,
          installment_count: installmentCount,
          card_type: cardType,
          store_card: storeCard,
          ctoken: null,
        },
        isValid,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ccOwner, cardNumber, expiryMonth, expiryYear, cvv, installmentCount, cardType, storeCard, selectedCtoken, useNewCard]);

  // Fixed 6 installments, all interest-free (vade farksız)
  // Installments are always based on the undiscounted price
  const instTotal = installmentTotal && installmentTotal > orderTotal ? installmentTotal : orderTotal;

  const getAvailableInstallments = (): { count: number; monthly: number }[] => {
    if (!cardType || !ratesLoaded) return [];

    // Check if this card brand has any installment support from PayTR
    const brandRates = installmentRates[cardType] || installmentRates[cardType.toLowerCase()] || [];
    if (!Array.isArray(brandRates) || brandRates.length === 0) return [];

    // Offer 2-6 installments, all at undiscounted cash price (no interest)
    return [2, 3, 4, 5, 6].map((count) => ({
      count,
      monthly: instTotal / count,
    }));
  };

  const availableInstallments = getAvailableInstallments();

  const currentYear = new Date().getFullYear() % 100;
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const years = Array.from({ length: 12 }, (_, i) => String((currentYear + i) % 100).padStart(2, '0'));

  const getSchemaIcon = (schema: string) => {
    const s = schema?.toLowerCase() || '';
    if (s.includes('visa')) return 'VISA';
    if (s.includes('master')) return 'MC';
    if (s.includes('troy')) return 'TROY';
    if (s.includes('amex')) return 'AMEX';
    return schema?.toUpperCase() || '';
  };

  const handleSelectSavedCard = (ctoken: string) => {
    setSelectedCtoken(ctoken);
    setUseNewCard(false);
    setCvv('');
    setInstallmentCount(0);
    // Set card_type from saved card for installment lookup
    const card = savedCards.find((c) => c.ctoken === ctoken);
    if (card) setCardType(card.c_brand?.toLowerCase() || '');
  };

  const handleSelectNewCard = () => {
    setUseNewCard(true);
    setSelectedCtoken(null);
    setCvv('');
    setInstallmentCount(0);
  };

  if (savedCardsLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        <span className="ml-2 text-sm text-secondary-500">Yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Saved Cards Section */}
      {savedCards.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-secondary-800">
            <ShieldCheck className="h-4 w-4 text-primary-600" />
            Kayıtlı Kartlarım
          </h4>
          <div className="space-y-2">
            {savedCards.map((card) => {
              const isSelected = !useNewCard && selectedCtoken === card.ctoken;
              return (
                <div key={card.ctoken}>
                  <label
                    className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-sm transition-colors ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-secondary-200 bg-white hover:border-secondary-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="card_selection"
                        checked={isSelected}
                        onChange={() => handleSelectSavedCard(card.ctoken)}
                        className="h-4 w-4 text-primary-600"
                      />
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded bg-secondary-100 px-1.5 py-0.5 text-[10px] font-bold text-secondary-700">
                          {getSchemaIcon(card.schema)}
                        </span>
                        <span className="font-mono font-medium text-secondary-900">
                          **** {card.last_4}
                        </span>
                      </div>
                      <span className="text-secondary-500">{card.c_bank}</span>
                    </div>
                    <span className="text-xs text-secondary-400">
                      {card.month}/{card.year}
                    </span>
                  </label>

                  {/* CVV input for saved card */}
                  {isSelected && Number(card.require_cvv) === 1 && (
                    <div className="mt-2 ml-7 max-w-[120px]">
                      <Input
                        label="CVV"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="000"
                        maxLength={4}
                        inputMode="numeric"
                        autoComplete="cc-csc"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* New Card Option */}
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
              useNewCard
                ? 'border-primary-500 bg-primary-50'
                : 'border-secondary-200 bg-white hover:border-secondary-300'
            }`}
          >
            <input
              type="radio"
              name="card_selection"
              checked={useNewCard}
              onChange={handleSelectNewCard}
              className="h-4 w-4 text-primary-600"
            />
            <CreditCard className="h-4 w-4 text-secondary-500" />
            <span className="font-medium text-secondary-700">Yeni Kart ile Öde</span>
          </label>
        </div>
      )}

      {/* New Card Form */}
      {(useNewCard || savedCards.length === 0) && (
        <div className="space-y-4">
          {/* Card Owner */}
          <Input
            label="Kart Sahibi"
            value={ccOwner}
            onChange={(e) => setCcOwner(e.target.value.toUpperCase())}
            placeholder="AD SOYAD"
            maxLength={100}
            autoComplete="cc-name"
          />

          {/* Card Number */}
          <div>
            <Input
              label="Kart Numarası"
              value={cardNumber}
              onChange={(e) => handleCardNumberChange(e.target.value)}
              placeholder="0000 0000 0000 0000"
              maxLength={19}
              inputMode="numeric"
              autoComplete="cc-number"
            />
            {binLoading && (
              <p className="mt-1 text-xs text-secondary-400">Kart sorgulanıyor...</p>
            )}
            {binInfo && (
              <div className="mt-1.5 flex items-center gap-2 text-xs text-secondary-600">
                <Building2 className="h-3.5 w-3.5" />
                <span>{binInfo.bank}</span>
                <span className="text-secondary-300">|</span>
                <span className="font-medium">{binInfo.brand}</span>
                <span className="text-secondary-300">|</span>
                <span>{binInfo.card_type === 'credit' ? 'Kredi Kartı' : 'Banka Kartı'}</span>
              </div>
            )}
          </div>

          {/* Expiry & CVV */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-secondary-700">Ay</label>
              <select
                value={expiryMonth}
                onChange={(e) => setExpiryMonth(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 text-sm text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                autoComplete="cc-exp-month"
              >
                <option value="">Ay</option>
                {months.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-secondary-700">Yıl</label>
              <select
                value={expiryYear}
                onChange={(e) => setExpiryYear(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 text-sm text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                autoComplete="cc-exp-year"
              >
                <option value="">Yıl</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <Input
                label="CVV"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="000"
                maxLength={4}
                inputMode="numeric"
                autoComplete="cc-csc"
              />
            </div>
          </div>

          {/* Store Card Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={storeCard}
              onChange={(e) => setStoreCard(e.target.checked)}
              className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-secondary-700">Kartımı sonraki alışverişler için kaydet</span>
          </label>
        </div>
      )}

      {/* Installment Options - shown for both saved and new cards when cardType is known */}
      {cardType && ratesLoaded && (
        <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-secondary-800">
            <CreditCard className="h-4 w-4" />
            Taksit Seçenekleri
          </h4>

          {/* Savings info when installment price differs from discounted price */}
          {installmentSavings > 0 && (
            <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
              <p className="text-green-800">
                <span className="font-semibold">Peşin fiyatına taksit!</span>{' '}
                Taksitli ödemelerde liste fiyatı ({formatPrice(instTotal)}) üzerinden vade farksız taksit uygulanır.
              </p>
              <p className="mt-1 font-semibold text-green-700">
                Kazancınız: {formatPrice(installmentSavings)}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            {/* Single payment */}
            <label
              className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-sm transition-colors ${
                installmentCount === 0
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-secondary-200 bg-white hover:border-secondary-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="installment"
                  checked={installmentCount === 0}
                  onChange={() => setInstallmentCount(0)}
                  className="h-4 w-4 text-primary-600"
                />
                <span className="font-medium">Tek Çekim</span>
              </div>
              <span className="font-semibold text-secondary-900">{formatPrice(orderTotal)}</span>
            </label>

            {/* Installment options — all interest-free at undiscounted price */}
            {availableInstallments.map((inst) => (
              <label
                key={inst.count}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-sm transition-colors ${
                  installmentCount === inst.count
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-secondary-200 bg-white hover:border-secondary-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="installment"
                    checked={installmentCount === inst.count}
                    onChange={() => setInstallmentCount(inst.count)}
                    className="h-4 w-4 text-primary-600"
                  />
                  <span className="font-medium">{inst.count} Taksit</span>
                  <span className="text-secondary-500">x {formatPrice(inst.monthly)}</span>
                  <span className="inline-flex rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                    Vade Farksız
                  </span>
                </div>
                <span className="font-semibold text-secondary-900">{formatPrice(instTotal)}</span>
              </label>
            ))}

            {availableInstallments.length === 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-secondary-200 bg-white p-3 text-sm text-secondary-500">
                <Info className="h-4 w-4 flex-shrink-0" />
                <span>Bu kart ile taksitli ödeme yapılamaz.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
