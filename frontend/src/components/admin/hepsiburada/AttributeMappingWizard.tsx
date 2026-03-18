'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Package,
  Send,
  XCircle,
} from 'lucide-react';
import api from '@/lib/api';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import WizardStepper from '@/components/admin/WizardStepper';
import CategoryAttributeForm from './CategoryAttributeForm';
import type { AttributeFormValues, PerProductValues } from './CategoryAttributeForm';
import type {
  HBPrepareSendResponse,
  HBPrepareSendCategoryGroup,
  HBCategoryAttribute,
} from '@/types/api';

interface SendBatchResponse {
  message: string;
  batchId: string;
  totalProducts: number;
  totalBatches: number;
}

interface SendProgressResponse {
  totalJobs: number;
  pendingJobs: number;
  failedJobs: number;
  processedJobs: number;
  progress: number;
  finished: boolean;
  cancelled: boolean;
}

interface SendingState {
  batchId: string;
  totalBatches: number;
  totalProducts: number;
  progress: number;
  processedJobs: number;
  failedJobs: number;
  finished: boolean;
}

interface AttributeMappingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProductIds: number[];
  onSuccess: (result: { message: string; batchId?: string }) => void;
  defaultMinStock?: number;
  priceOverrides?: Record<number, number>;
}

const WIZARD_STEPS = [
  { label: 'Ürün Kontrolü' },
  { label: 'Özellik Eşleştirme' },
  { label: 'Onayla & Gönder' },
];

function getAttrKey(attr: HBCategoryAttribute): string {
  return attr.name ?? '';
}

interface GroupState {
  categoryValues: AttributeFormValues;
  perProductValues: PerProductValues;
}

export default function AttributeMappingWizard({
  isOpen,
  onClose,
  selectedProductIds,
  onSuccess,
  defaultMinStock = 0,
  priceOverrides,
}: AttributeMappingWizardProps) {
  const [step, setStep] = useState(1);
  const [minStockThreshold, setMinStockThreshold] = useState(defaultMinStock);
  const [prepareData, setPrepareData] = useState<HBPrepareSendResponse | null>(null);
  const [groupStates, setGroupStates] = useState<Record<number, GroupState>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  // Prepare mutation — fetches category attribute data
  const prepareMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      const { data } = await api.post<HBPrepareSendResponse>(
        '/admin/hepsiburada/products/prepare-send',
        { product_ids: productIds },
      );
      return data;
    },
    onSuccess: (data) => {
      setPrepareData(data);

      const states: Record<number, GroupState> = {};
      const expanded = new Set<number>();

      const colorAttrNames = new Set(['renk', 'web color']);

      data.categoryGroups.forEach((group) => {
        const catValues: AttributeFormValues = {};
        const perProduct: PerProductValues = {};

        for (const attr of group.categoryAttributes) {
          const attrName = getAttrKey(attr);
          const attrNameLower = attrName.toLowerCase();

          // product_data kaynağından autoMatched olanlar (baseAttributes) skip —
          // formatter bunları ürün verisinden direkt dolduruyor.
          if (attr.autoMatched && attr.autoMatchSource === 'product_data') {
            continue;
          }

          // variant kaynağından autoMatched: populate per-product values
          // so they get saved to product_attributes during the save step.
          if (attr.autoMatched) {
            for (const product of group.products) {
              const existing = product.existingAttributes.find(
                (ea) => ea.attribute_name.toLowerCase() === attrNameLower,
              );
              if (!perProduct[product.id]) perProduct[product.id] = {};
              perProduct[product.id][attrName] = existing?.attribute_value ?? '';
            }
            continue;
          }

          if (colorAttrNames.has(attrNameLower)) {
            // Renk/Web Color: her ürünün kendi değerini al
            for (const product of group.products) {
              const existing = product.existingAttributes.find(
                (ea) => ea.attribute_name.toLowerCase() === attrNameLower,
              );
              if (existing) {
                if (!perProduct[product.id]) perProduct[product.id] = {};
                perProduct[product.id][attrName] = existing.attribute_value;
              }
            }
          } else {
            // Diğer özellikler: ilk ürünün değerini kategori seviyesine koy
            const firstProduct = group.products[0];
            if (firstProduct) {
              const existing = firstProduct.existingAttributes.find(
                (ea) => ea.attribute_name.toLowerCase() === attrNameLower,
              );
              if (existing) {
                catValues[attrName] = existing.attribute_value;
              }
            }
          }
        }

        states[group.localCategoryId] = {
          categoryValues: catValues,
          perProductValues: perProduct,
        };

        expanded.add(group.localCategoryId);
      });

      setGroupStates(states);
      setExpandedGroups(expanded);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Hazırlık verisi alınamadı');
    },
  });

  // Save category attributes mutation
  const saveCategoryAttrsMutation = useMutation({
    mutationFn: async (payload: {
      groups: { productIds: number[]; attributes: { attribute_name: string; attribute_value: string }[] }[];
      perProduct: { productId: number; attributes: { attribute_name: string; attribute_value: string }[] }[];
    }) => {
      const promises: Promise<unknown>[] = [];

      for (const group of payload.groups) {
        if (group.attributes.length > 0) {
          promises.push(
            api.post('/admin/hepsiburada/products/save-category-attributes', {
              product_ids: group.productIds,
              attributes: group.attributes,
            }),
          );
        }
      }

      for (const pp of payload.perProduct) {
        if (pp.attributes.length > 0) {
          promises.push(
            api.post('/admin/hepsiburada/products/save-attributes', {
              product_id: pp.productId,
              attributes: pp.attributes,
            }),
          );
        }
      }

      await Promise.all(promises);
    },
  });

  // Sending state for batch progress
  const [sendingState, setSendingState] = useState<SendingState | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMinStockThreshold(defaultMinStock);
    }
  }, [isOpen, defaultMinStock]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // Send products mutation — dispatches batch jobs
  const sendMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      const { data } = await api.post<SendBatchResponse>('/admin/hepsiburada/products/send', {
        product_ids: productIds,
        min_stock: minStockThreshold,
        price_overrides: priceOverrides ?? {},
      });
      return data;
    },
    onSuccess: (result) => {
      setSendingState({
        batchId: result.batchId,
        totalBatches: result.totalBatches,
        totalProducts: result.totalProducts,
        progress: 0,
        processedJobs: 0,
        failedJobs: 0,
        finished: false,
      });

      // Start polling
      pollingRef.current = setInterval(async () => {
        try {
          const { data } = await api.get<SendProgressResponse>(
            `/admin/hepsiburada/products/send-progress/${result.batchId}`
          );

          setSendingState((prev) => prev ? {
            ...prev,
            progress: data.progress,
            processedJobs: data.processedJobs,
            failedJobs: data.failedJobs,
            finished: data.finished || data.cancelled,
          } : null);

          if (data.finished || data.cancelled) {
            stopPolling();
            if (data.cancelled) {
              toast.error('Gönderim iptal edildi.');
            } else if (data.failedJobs > 0) {
              toast.warning(`Gönderim tamamlandı. ${data.failedJobs} batch başarısız oldu.`);
            } else {
              toast.success('Tüm ürünler başarıyla gönderildi!');
            }
            onSuccess({ message: result.message, batchId: result.batchId });
          }
        } catch {
          // Polling hatası — sessizce devam et
        }
      }, 3000);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Gönderim başarısız');
    },
  });

  // Computed: products to send (kritik stok filtresi)
  const productsToSend = useMemo(() => {
    if (!prepareData) return [];

    return prepareData.categoryGroups.flatMap((g) =>
      g.products.filter((p) => {
        if (p.stockQuantity <= minStockThreshold) return false;
        return g.marketplaceCategoryId !== null;
      }),
    );
  }, [prepareData, minStockThreshold]);

  // Kritik stok altında kalan ürün sayısı
  const belowThresholdCount = useMemo(() => {
    if (!prepareData) return 0;
    return prepareData.categoryGroups
      .flatMap((g) => g.products)
      .filter((p) => p.stockQuantity <= minStockThreshold).length;
  }, [prepareData, minStockThreshold]);

  const unmappedGroups = useMemo(() => {
    if (!prepareData) return [];
    return prepareData.categoryGroups.filter((g) => g.marketplaceCategoryId === null);
  }, [prepareData]);

  const [hasFetched, setHasFetched] = useState(false);

  // Load data when the dialog opens
  if (isOpen && !hasFetched && !prepareMutation.isPending) {
    setHasFetched(true);
    prepareMutation.mutate(selectedProductIds);
  }

  const isSending = sendMutation.isPending || (sendingState !== null && !sendingState.finished);

  const handleClose = () => {
    if (isSending) return;
    stopPolling();
    setHasFetched(false);
    setPrepareData(null);
    setGroupStates({});
    setSendingState(null);
    setStep(1);
    onClose();
  };

  const toggleGroup = (categoryId: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const validateStep2 = (): boolean => {
    if (!prepareData) return false;

    for (const group of prepareData.categoryGroups) {
      if (!group.marketplaceCategoryId) continue;

      const state = groupStates[group.localCategoryId];
      if (!state) continue;

      for (const attr of group.categoryAttributes) {
        if (!(attr.required || attr.mandatory)) continue;

        const key = getAttrKey(attr);
        const keyLower = key.toLowerCase();

        if (attr.autoMatched) {
          // product_data kaynağı → formatter dolduruyor, skip
          if (attr.autoMatchSource === 'product_data') continue;

          // variant kaynağı → product_attributes'te kontrol et
          const catVal = state.categoryValues[key];
          if (!catVal) {
            for (const p of group.products) {
              const hasValue = p.existingAttributes.some(
                (ea) => ea.attribute_name.toLowerCase() === keyLower && ea.attribute_value,
              );
              if (!hasValue) {
                const productVal = state.perProductValues[p.id]?.[key];
                if (!productVal) return false;
              }
            }
          }
          continue;
        }

        const val = state.categoryValues[key];

        let hasAllProducts = true;
        if (!val) {
          for (const p of group.products) {
            const productVal = state.perProductValues[p.id]?.[key];
            if (!productVal) {
              hasAllProducts = false;
              break;
            }
          }
          if (!hasAllProducts) return false;
        }
      }
    }

    return true;
  };

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!validateStep2()) {
        toast.warning('Lütfen tüm zorunlu özellikleri doldurun.');
        return;
      }

      if (!prepareData) return;

      const groups: { productIds: number[]; attributes: { attribute_name: string; attribute_value: string }[] }[] = [];
      const perProduct: { productId: number; attributes: { attribute_name: string; attribute_value: string }[] }[] = [];

      for (const group of prepareData.categoryGroups) {
        if (!group.marketplaceCategoryId) continue;

        const state = groupStates[group.localCategoryId];
        if (!state) continue;

        const catAttrs: { attribute_name: string; attribute_value: string }[] = [];
        for (const [name, value] of Object.entries(state.categoryValues)) {
          if (value) {
            catAttrs.push({ attribute_name: name, attribute_value: value });
          }
        }
        if (catAttrs.length > 0) {
          groups.push({ productIds: group.productIds, attributes: catAttrs });
        }

        for (const [productIdStr, values] of Object.entries(state.perProductValues)) {
          const productId = Number(productIdStr);
          const attrs: { attribute_name: string; attribute_value: string }[] = [];
          for (const [name, value] of Object.entries(values as AttributeFormValues)) {
            if (value) {
              attrs.push({ attribute_name: name, attribute_value: value as string });
            }
          }
          if (attrs.length > 0) {
            perProduct.push({ productId, attributes: attrs });
          }
        }
      }

      try {
        await saveCategoryAttrsMutation.mutateAsync({ groups, perProduct });
        setStep(3);
      } catch {
        toast.error('Özellikler kaydedilemedi.');
      }

      return;
    }

    if (step === 3) {
      const ids = productsToSend.map((p) => p.id);
      if (ids.length === 0) {
        toast.warning('Gönderilecek ürün yok.');
        return;
      }
      sendMutation.mutate(ids);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const isLoading = prepareMutation.isPending || saveCategoryAttrsMutation.isPending || sendMutation.isPending || isSending;

  return (
    <Dialog isOpen={isOpen} onClose={isSending ? () => {} : handleClose} className="max-w-5xl">
      {!isSending && <DialogClose onClose={handleClose} />}
      <DialogHeader>
        <DialogTitle>Hepsiburada Ürün Gönderim Sihirbazı</DialogTitle>
        <div className="mt-4">
          <WizardStepper
            steps={WIZARD_STEPS}
            currentStep={step}
            onStepClick={(s) => s < step && setStep(s)}
          />
        </div>
      </DialogHeader>

      <DialogContent className="min-h-[400px]">
        {prepareMutation.isPending ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            <p className="mt-3 text-sm text-secondary-500">Ürün bilgileri hazırlanıyor...</p>
          </div>
        ) : prepareMutation.isError ? (
          <div className="flex flex-col items-center justify-center py-16">
            <XCircle className="h-8 w-8 text-red-500" />
            <p className="mt-3 text-sm text-red-600">Veri alınamadı. Lütfen tekrar deneyin.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => prepareMutation.mutate(selectedProductIds)}
            >
              Tekrar Dene
            </Button>
          </div>
        ) : prepareData ? (
          <>
            {/* Step 1: Product Check */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Kritik stok */}
                <div className="rounded-lg border border-secondary-200 p-3">
                  <div className="flex items-center gap-3">
                    <label htmlFor="hb-min-stock" className="text-sm font-medium text-secondary-700 whitespace-nowrap">
                      Kritik Stok
                    </label>
                    <input
                      id="hb-min-stock"
                      type="number"
                      min="0"
                      value={minStockThreshold}
                      onChange={(e) => setMinStockThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                      className="h-8 w-20 rounded-md border border-secondary-200 bg-white px-2 text-sm text-center focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                    <span className="text-xs text-secondary-500">
                      ve altındaki ürünler gönderilmeyecek
                    </span>
                  </div>
                </div>

                {/* Below threshold warning */}
                {minStockThreshold > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-amber-700">
                        Stoku {minStockThreshold} ve altında olan ürün/varyantlar gönderilmeyecek
                      </p>
                      <p className="text-xs text-amber-600">
                        {belowThresholdCount > 0
                          ? `${belowThresholdCount} ürün tamamen hariç bırakılacak. Varyantlı ürünlerde eşik altındaki varyantlar tek tek elenecek.`
                          : 'Varyantlı ürünlerde eşik altındaki varyantlar tek tek elenecek.'}
                      </p>
                    </div>
                  </div>
                )}

                {unmappedGroups.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                    <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-red-700">
                        Kategori eşleşmesi eksik
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {unmappedGroups.map((g) => (
                          <li key={g.localCategoryId} className="text-xs text-red-600">
                            {g.localCategoryName} — {g.products.length} ürün (gönderilmeyecek)
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Kategori Grupları
                  </p>
                  <div className="space-y-2">
                    {prepareData.categoryGroups.map((group) => (
                      <div
                        key={group.localCategoryId}
                        className={`flex items-center justify-between rounded-lg border p-3 ${
                          group.marketplaceCategoryId
                            ? 'border-secondary-200 bg-white'
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {group.marketplaceCategoryId ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )}
                          <span className="text-sm font-medium text-secondary-900">
                            {group.localCategoryName}
                          </span>
                          {group.marketplaceCategoryName && (
                            <span className="text-xs text-secondary-400">
                              &rarr; {group.marketplaceCategoryName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{group.products.length} ürün</Badge>
                          <Badge variant="outline">
                            {group.categoryAttributes.filter((a) => (a.required || a.mandatory) && !a.autoMatched).length} zorunlu özellik
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-primary-200 bg-primary-50 p-3">
                  <p className="text-sm text-primary-700">
                    <strong>{productsToSend.length}</strong> ürün gönderime hazır.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Attribute Mapping */}
            {step === 2 && (
              <div className="space-y-3">
                {prepareData.categoryGroups
                  .filter((g) => g.marketplaceCategoryId !== null)
                  .map((group) => {
                    const isExpanded = expandedGroups.has(group.localCategoryId);
                    const state = groupStates[group.localCategoryId] ?? {
                      categoryValues: {},
                      perProductValues: {},
                    };

                    return (
                      <div
                        key={group.localCategoryId}
                        className="rounded-lg border border-secondary-200"
                      >
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.localCategoryId)}
                          className="flex w-full items-center justify-between p-3 text-left hover:bg-secondary-50"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-secondary-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-secondary-400" />
                            )}
                            <span className="text-sm font-medium text-secondary-900">
                              {group.localCategoryName}
                            </span>
                            <Badge variant="outline">{group.products.length} ürün</Badge>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-secondary-200 p-4">
                            <CategoryAttributeForm
                              localCategoryName={group.localCategoryName}
                              marketplaceCategoryName={group.marketplaceCategoryName}
                              marketplaceCategoryId={group.marketplaceCategoryId}
                              products={group.products}
                              categoryAttributes={group.categoryAttributes}
                              categoryValues={state.categoryValues}
                              onCategoryValuesChange={(values) =>
                                setGroupStates((prev) => ({
                                  ...prev,
                                  [group.localCategoryId]: {
                                    ...prev[group.localCategoryId],
                                    categoryValues: values,
                                  },
                                }))
                              }
                              perProductValues={state.perProductValues}
                              onPerProductValuesChange={(values) =>
                                setGroupStates((prev) => ({
                                  ...prev,
                                  [group.localCategoryId]: {
                                    ...prev[group.localCategoryId],
                                    perProductValues: values,
                                  },
                                }))
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Step 3: Confirm & Send */}
            {step === 3 && (
              <div className="space-y-4 py-4">
                {sendingState ? (
                  <div className="mx-auto max-w-md space-y-5">
                    <div className="flex flex-col items-center text-center">
                      {sendingState.finished ? (
                        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                      ) : (
                        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
                      )}
                      <h3 className="mt-3 text-lg font-semibold text-secondary-900">
                        {sendingState.finished ? 'Gönderim Tamamlandı' : 'Ürünler Gönderiliyor...'}
                      </h3>
                      <p className="mt-1 text-sm text-secondary-500">
                        {sendingState.finished
                          ? `${sendingState.totalProducts} ürün işlendi.`
                          : 'Lütfen bekleyin, ürünler Hepsiburada\'ya gönderiliyor.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-secondary-600">İlerleme</span>
                        <span className="font-medium text-secondary-900">
                          %{Math.round(sendingState.progress)}
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-secondary-200">
                        <div
                          className="h-full rounded-full bg-primary-600 transition-all duration-500"
                          style={{ width: `${sendingState.progress}%` }}
                        />
                      </div>
                      <p className="text-center text-xs text-secondary-500">
                        {sendingState.processedJobs} / {sendingState.totalBatches} batch tamamlandı
                      </p>
                    </div>

                    {sendingState.failedJobs > 0 && (
                      <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                        <div>
                          <p className="text-sm font-medium text-red-700">
                            {sendingState.failedJobs} batch başarısız oldu
                          </p>
                          <p className="text-xs text-red-600">
                            Bazı ürünler gönderilemedi. Hata detayları için logları kontrol edin.
                          </p>
                        </div>
                      </div>
                    )}

                    {sendingState.finished && (
                      <div className="flex justify-center pt-2">
                        <Button onClick={handleClose}>Kapat</Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col items-center text-center">
                      <Package className="h-12 w-12 text-primary-600" />
                      <h3 className="mt-3 text-lg font-semibold text-secondary-900">
                        Gönderime Hazır
                      </h3>
                      <p className="mt-1 text-sm text-secondary-500">
                        Aşağıdaki özet bilgileri kontrol edip gönderimi başlatın.
                      </p>
                    </div>

                    <div className="mx-auto max-w-md space-y-3">
                      <div className="flex items-center justify-between rounded-lg border border-secondary-200 p-3">
                        <span className="text-sm text-secondary-600">Gönderilecek ürün</span>
                        <Badge variant="default">{productsToSend.length}</Badge>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-secondary-200 p-3">
                        <span className="text-sm text-secondary-600">Kategori sayısı</span>
                        <Badge variant="outline">
                          {prepareData.categoryGroups.filter((g) => g.marketplaceCategoryId !== null).length}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-secondary-200 p-3">
                        <span className="text-sm text-secondary-600">Batch sayısı</span>
                        <Badge variant="outline">
                          {Math.ceil(productsToSend.length / 100)}
                        </Badge>
                      </div>

                      {belowThresholdCount > 0 && (
                        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3">
                          <span className="text-sm text-amber-700">Stok ≤ {minStockThreshold} (hariç bırakıldı)</span>
                          <Badge variant="warning">{belowThresholdCount}</Badge>
                        </div>
                      )}

                      {unmappedGroups.length > 0 && (
                        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3">
                          <span className="text-sm text-red-700">Kategori eşleşmesi yok (hariç)</span>
                          <Badge variant="danger">
                            {unmappedGroups.reduce((sum, g) => sum + g.products.length, 0)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        ) : null}
      </DialogContent>

      <DialogFooter>
        {!sendingState && (
          <>
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} disabled={isLoading}>
                Geri
              </Button>
            )}
            <Button variant="ghost" onClick={handleClose} disabled={isSending}>
              İptal
            </Button>
            <Button onClick={handleNext} disabled={isLoading || !prepareData}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : step === 3 ? (
                <Send className="h-4 w-4" />
              ) : null}
              {step === 1 && 'İleri'}
              {step === 2 && (saveCategoryAttrsMutation.isPending ? 'Kaydediliyor...' : 'Kaydet & İleri')}
              {step === 3 && (sendMutation.isPending ? 'Gönderiliyor...' : "Hepsiburada'ya Gönder")}
            </Button>
          </>
        )}
      </DialogFooter>
    </Dialog>
  );
}
