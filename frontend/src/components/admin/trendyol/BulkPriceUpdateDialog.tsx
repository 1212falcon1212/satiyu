'use client';

import React, { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  MinusCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────
interface PriceRule {
  min_price: string;
  max_price: string;
  adjustment_type: 'percentage' | 'fixed';
  adjustment_value: string;
}

interface PreviewVariant {
  id: number;
  values: string;
  currentPrice: number;
  newPrice: number;
  changed: boolean;
}

interface PreviewProduct {
  id: number;
  name: string;
  hasVariants: boolean;
  currentPrice: number;
  newPrice: number;
  changed: boolean;
  variants: PreviewVariant[];
}

interface PreviewResponse {
  products: PreviewProduct[];
  summary: {
    total: number;
    affected: number;
    unchanged: number;
  };
}

export interface PriceOverrides {
  products: Record<number, number>; // productId → newPrice
  variants: Record<number, number>; // variantId → newPrice
}

interface BulkPriceUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProductIds: number[];
  onApply: (overrides: PriceOverrides) => void;
  previewEndpoint?: string;
  marketplace?: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price);
}

function formatChange(current: number, next: number): string {
  if (current === 0) return '-';
  const pct = ((next - current) / current) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

const emptyRule = (): PriceRule => ({
  min_price: '',
  max_price: '',
  adjustment_type: 'percentage',
  adjustment_value: '',
});

// ─── Component ──────────────────────────────────────────────────
export default function BulkPriceUpdateDialog({
  isOpen,
  onClose,
  selectedProductIds,
  onApply,
  previewEndpoint = '/admin/trendyol/products/bulk-price-preview',
  marketplace = 'Trendyol',
}: BulkPriceUpdateDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [rules, setRules] = useState<PriceRule[]>([emptyRule()]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  const resetState = useCallback(() => {
    setStep(1);
    setRules([emptyRule()]);
    setPreview(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  // ─── Rule management ─────────────────────────────────────
  const addRule = () => setRules((prev) => [...prev, emptyRule()]);

  const removeRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, field: keyof PriceRule, value: string) => {
    setRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  // ─── Validation ──────────────────────────────────────────
  const isRulesValid = rules.every(
    (r) =>
      r.min_price !== '' &&
      r.max_price !== '' &&
      r.adjustment_value !== '' &&
      Number(r.max_price) >= Number(r.min_price) &&
      !isNaN(Number(r.min_price)) &&
      !isNaN(Number(r.max_price)) &&
      !isNaN(Number(r.adjustment_value))
  );

  // ─── Preview mutation ────────────────────────────────────
  const previewMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        product_ids: selectedProductIds,
        rules: rules.map((r) => ({
          min_price: Number(r.min_price),
          max_price: Number(r.max_price),
          adjustment_type: r.adjustment_type,
          adjustment_value: Number(r.adjustment_value),
        })),
      };
      const { data } = await api.post(previewEndpoint, payload);
      return data as PreviewResponse;
    },
    onSuccess: (data) => {
      setPreview(data);
      setStep(2);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Önizleme alınamadı');
    },
  });

  // ─── Apply (sadece override map'i döndürür, API çağrısı yok) ──
  const handleApply = useCallback(() => {
    if (!preview) return;

    const overrides: PriceOverrides = { products: {}, variants: {} };
    for (const p of preview.products) {
      if (p.hasVariants) {
        for (const v of p.variants) {
          if (v.changed) {
            overrides.variants[v.id] = v.newPrice;
          }
        }
      } else if (p.changed) {
        overrides.products[p.id] = p.newPrice;
      }
    }

    const count = Object.keys(overrides.products).length + Object.keys(overrides.variants).length;
    toast.success(`${count} ürün/varyant için ${marketplace} gönderim fiyatı güncellendi`);

    resetState();
    onClose();
    onApply(overrides);
  }, [preview, resetState, onClose, onApply]);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} className="max-w-3xl">
      <DialogClose onClose={handleClose} />

      {step === 1 ? (
        <>
          <DialogHeader>
            <DialogTitle>Toplu Fiyat Güncelle</DialogTitle>
            <DialogDescription>
              {selectedProductIds.length} ürün için {marketplace} gönderim fiyatlarını ayarlayın. Sitedeki fiyatlar değişmez.
            </DialogDescription>
          </DialogHeader>

          <DialogContent className="space-y-4">
            {rules.map((rule, index) => (
              <div
                key={index}
                className="flex flex-wrap items-end gap-2 rounded-lg border border-secondary-200 bg-secondary-50 p-3"
              >
                {/* Min price */}
                <div className="flex-1 min-w-[80px]">
                  <label className="mb-1 block text-xs font-medium text-secondary-600">
                    Min (TL)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={rule.min_price}
                    onChange={(e) => updateRule(index, 'min_price', e.target.value)}
                    placeholder="0"
                    className="h-9 w-full rounded-md border border-secondary-200 bg-white px-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <span className="pb-2 text-sm text-secondary-400">-</span>

                {/* Max price */}
                <div className="flex-1 min-w-[80px]">
                  <label className="mb-1 block text-xs font-medium text-secondary-600">
                    Max (TL)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={rule.max_price}
                    onChange={(e) => updateRule(index, 'max_price', e.target.value)}
                    placeholder="1000"
                    className="h-9 w-full rounded-md border border-secondary-200 bg-white px-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <span className="pb-2 text-sm text-secondary-400">arası</span>

                {/* Adjustment type */}
                <div className="min-w-[100px]">
                  <label className="mb-1 block text-xs font-medium text-secondary-600">
                    Tip
                  </label>
                  <select
                    value={rule.adjustment_type}
                    onChange={(e) =>
                      updateRule(index, 'adjustment_type', e.target.value as 'percentage' | 'fixed')
                    }
                    className="h-9 w-full rounded-md border border-secondary-200 bg-white px-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="percentage">Yüzde (%)</option>
                    <option value="fixed">Sabit (TL)</option>
                  </select>
                </div>

                {/* Value */}
                <div className="min-w-[80px]">
                  <label className="mb-1 block text-xs font-medium text-secondary-600">
                    Değer
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={rule.adjustment_value}
                      onChange={(e) => updateRule(index, 'adjustment_value', e.target.value)}
                      placeholder="50"
                      className="h-9 w-full rounded-md border border-secondary-200 bg-white px-2 pr-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-secondary-400">
                      {rule.adjustment_type === 'percentage' ? '%' : 'TL'}
                    </span>
                  </div>
                </div>

                {/* Remove button */}
                {rules.length > 1 && (
                  <button
                    onClick={() => removeRule(index)}
                    className="mb-0.5 rounded-md p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Kuralı sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={addRule}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-secondary-300 py-2 text-sm text-secondary-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Kural Ekle
            </button>

            <p className="text-xs text-secondary-400">
              Pozitif değer = zam, negatif değer = indirim. Her ürüne ilk eşleşen kural uygulanır.
            </p>
          </DialogContent>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              İptal
            </Button>
            <Button
              onClick={() => previewMutation.mutate()}
              disabled={!isRulesValid || previewMutation.isPending}
            >
              {previewMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Önizleme
            </Button>
          </DialogFooter>
        </>
      ) : (
        <>
          <DialogHeader>
            <DialogTitle>Fiyat Önizleme</DialogTitle>
            {preview && (
              <DialogDescription>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
                  {preview.summary.affected}/{preview.summary.total} ürün etkilenecek
                </span>
              </DialogDescription>
            )}
          </DialogHeader>

          <DialogContent>
            {preview && (
              <div className="space-y-3">
                {/* Summary bar */}
                <div className="flex items-center gap-3 rounded-lg bg-secondary-50 px-3 py-2 text-xs text-secondary-600">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {preview.summary.affected} etkilenen
                  </span>
                  <span className="flex items-center gap-1">
                    <MinusCircle className="h-3.5 w-3.5 text-secondary-400" />
                    {preview.summary.unchanged} değişmeyen
                  </span>
                </div>

                {/* Table */}
                <div className="max-h-[400px] overflow-y-auto rounded-lg border border-secondary-200">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-secondary-50">
                      <tr className="border-b border-secondary-200">
                        <th className="px-3 py-2 text-left font-medium text-secondary-600">Ürün</th>
                        <th className="px-3 py-2 text-right font-medium text-secondary-600">Mevcut</th>
                        <th className="px-3 py-2 text-center font-medium text-secondary-600 w-8" />
                        <th className="px-3 py-2 text-right font-medium text-secondary-600">Yeni</th>
                        <th className="px-3 py-2 text-right font-medium text-secondary-600">Değişim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.products.map((product) => (
                        <React.Fragment key={product.id}>
                          {!product.hasVariants && (
                            <tr
                              className={cn(
                                'border-b border-secondary-100',
                                !product.changed && 'opacity-40'
                              )}
                            >
                              <td className="px-3 py-2 max-w-[200px] truncate" title={product.name}>
                                {product.name}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-xs">
                                {formatPrice(product.currentPrice)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {product.changed && (
                                  <ArrowRight className="mx-auto h-3.5 w-3.5 text-primary-500" />
                                )}
                              </td>
                              <td className={cn(
                                'px-3 py-2 text-right font-mono text-xs',
                                product.changed && 'font-semibold text-primary-700'
                              )}>
                                {product.changed ? formatPrice(product.newPrice) : '-'}
                              </td>
                              <td className={cn(
                                'px-3 py-2 text-right font-mono text-xs',
                                product.changed && (product.newPrice > product.currentPrice ? 'text-red-600' : 'text-emerald-600')
                              )}>
                                {product.changed ? formatChange(product.currentPrice, product.newPrice) : '-'}
                              </td>
                            </tr>
                          )}

                          {product.hasVariants && (
                            <>
                              <tr className="border-b border-secondary-100 bg-blue-50/30">
                                <td colSpan={5} className="px-3 py-1.5 text-xs font-semibold text-secondary-600">
                                  {product.name}
                                  <span className="ml-1 font-normal text-secondary-400">
                                    ({product.variants.length} varyant)
                                  </span>
                                </td>
                              </tr>
                              {product.variants.map((variant) => (
                                <tr
                                  key={variant.id}
                                  className={cn(
                                    'border-b border-secondary-100',
                                    !variant.changed && 'opacity-40'
                                  )}
                                >
                                  <td className="px-3 py-1.5 pl-6 text-xs text-secondary-500 max-w-[200px] truncate">
                                    {variant.values}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-mono text-xs">
                                    {formatPrice(variant.currentPrice)}
                                  </td>
                                  <td className="px-3 py-1.5 text-center">
                                    {variant.changed && (
                                      <ArrowRight className="mx-auto h-3 w-3 text-primary-500" />
                                    )}
                                  </td>
                                  <td className={cn(
                                    'px-3 py-1.5 text-right font-mono text-xs',
                                    variant.changed && 'font-semibold text-primary-700'
                                  )}>
                                    {variant.changed ? formatPrice(variant.newPrice) : '-'}
                                  </td>
                                  <td className={cn(
                                    'px-3 py-1.5 text-right font-mono text-xs',
                                    variant.changed && (variant.newPrice > variant.currentPrice ? 'text-red-600' : 'text-emerald-600')
                                  )}>
                                    {variant.changed ? formatChange(variant.currentPrice, variant.newPrice) : '-'}
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Info */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                  Sitedeki fiyatlar değişmez. Yeni fiyatlar tabloda gösterilir ve {marketplace}&apos;a gönderimde bu fiyatlar kullanılır.
                </div>
              </div>
            )}
          </DialogContent>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStep(1)}
            >
              <ArrowLeft className="h-4 w-4" />
              Geri
            </Button>
            <Button
              onClick={handleApply}
              disabled={!preview || preview.summary.affected === 0}
            >
              <CheckCircle2 className="h-4 w-4" />
              Uygula ({preview?.summary.affected ?? 0})
            </Button>
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
}
