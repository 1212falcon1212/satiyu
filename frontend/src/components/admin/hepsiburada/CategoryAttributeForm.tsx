'use client';

import { useState, useMemo, useCallback } from 'react';
import { Check, ChevronDown, ChevronRight, Copy, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AttributeField from './AttributeField';
import type { HBCategoryAttribute, PrepareSendProduct } from '@/types/api';

interface AttributeFormValues {
  [attributeKey: string]: string;
}

interface PerProductValues {
  [productId: number]: AttributeFormValues;
}

interface CategoryAttributeFormProps {
  localCategoryName: string;
  marketplaceCategoryName: string | null;
  marketplaceCategoryId: number | null;
  products: PrepareSendProduct[];
  categoryAttributes: HBCategoryAttribute[];
  categoryValues: AttributeFormValues;
  onCategoryValuesChange: (values: AttributeFormValues) => void;
  perProductValues: PerProductValues;
  onPerProductValuesChange: (values: PerProductValues) => void;
}

function getAttrKey(attr: HBCategoryAttribute): string {
  return attr.name ?? '';
}

export default function CategoryAttributeForm({
  localCategoryName,
  marketplaceCategoryName,
  marketplaceCategoryId,
  products,
  categoryAttributes,
  categoryValues,
  onCategoryValuesChange,
  perProductValues,
  onPerProductValuesChange,
}: CategoryAttributeFormProps) {
  const [mode, setMode] = useState<'category' | 'product'>('category');
  const [activeProductId, setActiveProductId] = useState<number>(products[0]?.id ?? 0);
  const [showOptional, setShowOptional] = useState(false);

  const switchToProductMode = useCallback(() => {
    const newPerProduct = { ...perProductValues };
    for (const product of products) {
      const existing = newPerProduct[product.id] ?? {};
      newPerProduct[product.id] = { ...categoryValues, ...existing };
    }
    onPerProductValuesChange(newPerProduct);
    setMode('product');
  }, [categoryValues, perProductValues, products, onPerProductValuesChange]);

  const switchToCategoryMode = useCallback(() => {
    setMode('category');
  }, []);

  const { autoMatchedAttrs, autoMatchedEditableAttrs, requiredAttrs, optionalAttrs, autoUnmatchedProductIds } = useMemo(() => {
    const autoFull: HBCategoryAttribute[] = [];
    const autoEditable: HBCategoryAttribute[] = [];
    const req: HBCategoryAttribute[] = [];
    const opt: HBCategoryAttribute[] = [];
    const unmatchedMap: Record<string, Set<number>> = {};

    for (const attr of categoryAttributes) {
      if (attr.autoMatched) {
        // product_data kaynağından eşleşenler (baseAttributes: Barkod, Marka, Görsel, Fiyat vb.)
        // formatter tarafından direkt ürün verisinden dolduruluyor, product_attributes tablosunda yok.
        // Bunları her zaman "tam eşleşmiş" say.
        if (attr.autoMatchSource === 'product_data') {
          autoFull.push(attr);
        } else {
          // variant kaynağından eşleşenler - product_attributes'te kontrole tabi
          const attrKeyLower = getAttrKey(attr).toLowerCase();
          const unmatched = new Set<number>();
          for (const p of products) {
            const hasValue = p.existingAttributes.some(
              (ea) => ea.attribute_name.toLowerCase() === attrKeyLower && ea.attribute_value,
            );
            if (!hasValue) unmatched.add(p.id);
          }
          if (unmatched.size > 0) {
            autoEditable.push(attr);
            unmatchedMap[getAttrKey(attr)] = unmatched;
          } else {
            autoFull.push(attr);
          }
        }
      } else if (attr.required || attr.mandatory) {
        req.push(attr);
      } else {
        opt.push(attr);
      }
    }

    return {
      autoMatchedAttrs: autoFull,
      autoMatchedEditableAttrs: autoEditable,
      requiredAttrs: req,
      optionalAttrs: opt,
      autoUnmatchedProductIds: unmatchedMap,
    };
  }, [categoryAttributes, products]);

  const hasCategoryValues = useMemo(() => {
    return Object.values(categoryValues).some((v) => v && v.trim() !== '');
  }, [categoryValues]);

  const isInheritedValue = useCallback((productId: number, attrKey: string): boolean => {
    if (mode !== 'product') return false;
    const perVal = perProductValues[productId]?.[attrKey];
    const catVal = categoryValues[attrKey];
    return !!perVal && !!catVal && perVal === catVal;
  }, [mode, perProductValues, categoryValues]);

  const productProgress = useMemo(() => {
    if (mode !== 'product') return {};
    const progress: Record<number, { filled: number; total: number }> = {};
    for (const product of products) {
      let filled = 0;
      let total = requiredAttrs.length;

      for (const attr of requiredAttrs) {
        const key = getAttrKey(attr);
        const val = perProductValues[product.id]?.[key] || categoryValues[key] || '';
        if (val.trim() !== '') filled++;
      }

      // Count autoMatchedEditable attrs for this product if unmatched
      for (const attr of autoMatchedEditableAttrs) {
        const key = getAttrKey(attr);
        if (autoUnmatchedProductIds[key]?.has(product.id)) {
          total++;
          const val = perProductValues[product.id]?.[key] || categoryValues[key] || '';
          if (val.trim() !== '') filled++;
        }
      }

      progress[product.id] = { filled, total };
    }
    return progress;
  }, [mode, products, requiredAttrs, autoMatchedEditableAttrs, autoUnmatchedProductIds, perProductValues, categoryValues]);

  const handleCategoryValueChange = (attrKey: string, value: string) => {
    onCategoryValuesChange({ ...categoryValues, [attrKey]: value });
  };

  const handleProductValueChange = (productId: number, attrKey: string, value: string) => {
    const current = perProductValues[productId] ?? {};
    onPerProductValuesChange({
      ...perProductValues,
      [productId]: { ...current, [attrKey]: value },
    });
  };

  const renderAttributeField = (
    attr: HBCategoryAttribute,
    value: string,
    onChangeValue: (val: string) => void,
  ) => {
    const attrName = getAttrKey(attr);
    return (
      <AttributeField
        key={attr.id}
        attributeName={attrName}
        attributeId={attr.id}
        attributeValues={attr.values ?? []}
        marketplaceCategoryId={marketplaceCategoryId}
        type={attr.type ?? 'text'}
        required={attr.required ?? attr.mandatory ?? false}
        value={value}
        onChange={onChangeValue}
      />
    );
  };

  const resolveValue = (attr: HBCategoryAttribute, productId?: number): string => {
    const key = getAttrKey(attr);

    if (mode === 'product' && productId !== undefined) {
      return perProductValues[productId]?.[key] || categoryValues[key] || '';
    }

    return categoryValues[key] ?? '';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-secondary-900">{localCategoryName}</h4>
          {marketplaceCategoryName && (
            <>
              <span className="text-secondary-400">&rarr;</span>
              <span className="text-sm text-secondary-600">{marketplaceCategoryName}</span>
            </>
          )}
          <Badge variant="outline">{products.length} ürün</Badge>
        </div>

        {products.length > 0 && (
          <div className="flex items-center gap-2">
            {mode === 'category' && hasCategoryValues && (
              <button
                type="button"
                onClick={switchToProductMode}
                className="flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100 transition-colors"
              >
                <Copy className="h-3 w-3" />
                Ürün Bazlı Düzenlemeye Geç
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
            <div className="flex items-center gap-1 rounded-lg border border-secondary-200 p-0.5">
              <button
                type="button"
                onClick={switchToCategoryMode}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  mode === 'category'
                    ? 'bg-primary-600 text-white'
                    : 'text-secondary-500 hover:text-secondary-700'
                }`}
              >
                Kategori Bazlı
              </button>
              <button
                type="button"
                onClick={switchToProductMode}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  mode === 'product'
                    ? 'bg-primary-600 text-white'
                    : 'text-secondary-500 hover:text-secondary-700'
                }`}
              >
                Ürün Bazlı
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Auto-matched attributes (fully matched - info only) */}
      {autoMatchedAttrs.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="mb-2 text-xs font-medium text-emerald-700">Otomatik Eşleşen Özellikler</p>
          <div className="flex flex-wrap gap-2">
            {autoMatchedAttrs.map((attr) => (
              <span
                key={attr.id}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs text-emerald-700"
              >
                <Check className="h-3 w-3" />
                {getAttrKey(attr)}
                <span className="text-emerald-500">({attr.autoMatchSource === 'variant' ? 'Varyant' : attr.autoMatchSource === 'product_data' ? 'Ürün Bilgisi' : 'Otomatik'})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Auto-matched editable attributes (some products missing values) */}
      {autoMatchedEditableAttrs.length > 0 && (() => {
        // Kategori bazlı veya ürün bazlı girilen değerleri dikkate al
        const stillMissingAttrs = autoMatchedEditableAttrs.filter((attr) => {
          const key = getAttrKey(attr);
          const catVal = categoryValues[key]?.trim();
          if (catVal) return false; // Kategori bazlı değer girilmişse eksik değil
          // Her ürün için perProduct veya existingAttributes kontrolü
          const unmatchedSet = autoUnmatchedProductIds[key];
          if (!unmatchedSet) return false;
          const stillUnmatched = [...unmatchedSet].filter((pid) => {
            const perVal = perProductValues[pid]?.[key]?.trim();
            return !perVal;
          });
          return stillUnmatched.length > 0;
        });

        if (stillMissingAttrs.length === 0) return null;

        return (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="mb-2 text-xs font-medium text-amber-700">Kısmen Eşleşen Özellikler (bazı ürünlerde eksik)</p>
            <div className="flex flex-wrap gap-2">
              {stillMissingAttrs.map((attr) => {
                const key = getAttrKey(attr);
                const unmatchedSet = autoUnmatchedProductIds[key];
                const remaining = unmatchedSet ? [...unmatchedSet].filter((pid) => {
                  const perVal = perProductValues[pid]?.[key]?.trim();
                  return !perVal;
                }).length : 0;
                return (
                  <span
                    key={attr.id}
                    className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-700"
                  >
                    {key}
                    <span className="text-amber-500">({remaining}/{products.length} üründe eksik)</span>
                  </span>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* No mappable category */}
      {!marketplaceCategoryName && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">
            Bu kategori için Hepsiburada kategori eşleşmesi bulunamadı. Öncelikle kategori eşleştirmesi yapın.
          </p>
        </div>
      )}

      {/* Required attributes */}
      {(requiredAttrs.length > 0 || autoMatchedEditableAttrs.length > 0) && marketplaceCategoryName && (
        <div>
          <p className="mb-2 text-xs font-medium text-secondary-500 uppercase tracking-wider">
            Zorunlu Özellikler
          </p>

          {mode === 'category' ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* AutoMatched editable attrs in category mode */}
              {autoMatchedEditableAttrs.map((attr) => {
                const key = getAttrKey(attr);
                const unmatchedCount = autoUnmatchedProductIds[key]?.size ?? 0;
                return (
                  <div key={attr.id} className="relative">
                    {renderAttributeField(
                      attr,
                      resolveValue(attr),
                      (val) => handleCategoryValueChange(key, val),
                    )}
                    <span className="absolute -top-1.5 right-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-medium text-amber-600">
                      {unmatchedCount}/{products.length} eksik
                    </span>
                  </div>
                );
              })}
              {requiredAttrs.map((attr) =>
                renderAttributeField(
                  attr,
                  resolveValue(attr),
                  (val) => handleCategoryValueChange(getAttrKey(attr), val),
                )
              )}
            </div>
          ) : (
            <div>
              {hasCategoryValues && (
                <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                  <p className="text-xs text-blue-700">
                    Kategori bazlı girilen değerler tüm ürünlere kopyalandı. Sadece farklı olan özellikleri değiştirin.
                  </p>
                </div>
              )}

              {/* Product tabs */}
              <div className="mb-3 flex gap-1 overflow-x-auto border-b border-secondary-200 pb-px">
                {products.map((p) => {
                  const prog = productProgress[p.id];
                  const isComplete = prog && prog.filled === prog.total;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setActiveProductId(p.id)}
                      className={`whitespace-nowrap rounded-t-lg px-2.5 py-2 text-xs font-medium transition-colors flex items-center gap-2 ${
                        activeProductId === p.id
                          ? 'border-b-2 border-primary-600 text-primary-700 bg-primary-50/50'
                          : 'text-secondary-500 hover:text-secondary-700'
                      }`}
                    >
                      {p.mainImage ? (
                        <img
                          src={p.mainImage}
                          alt=""
                          className="h-7 w-7 rounded object-cover flex-shrink-0 border border-secondary-200"
                        />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded bg-secondary-100 text-secondary-400 flex-shrink-0 text-[10px]">?</span>
                      )}
                      <span className="max-w-[140px] truncate">{p.name}</span>
                      {prog && (
                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          isComplete
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {prog.filled}/{prog.total}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active product preview */}
              {(() => {
                const activeProduct = products.find((p) => p.id === activeProductId);
                if (!activeProduct) return null;

                // Show auto-matched values for this product
                const autoValues = autoMatchedAttrs
                  .map((attr) => {
                    const key = getAttrKey(attr);
                    const vals = activeProduct.existingAttributes
                      .filter((ea) => ea.attribute_name.toLowerCase() === key.toLowerCase() && ea.attribute_value);
                    return vals.length > 0 ? `${key}: ${vals.map((v) => v.attribute_value).join(', ')}` : null;
                  })
                  .filter(Boolean);

                return (
                  <div className="mb-3 flex items-center gap-3 rounded-lg border border-secondary-200 bg-secondary-50/50 px-3 py-2">
                    {activeProduct.mainImage ? (
                      <img
                        src={activeProduct.mainImage}
                        alt=""
                        className="h-14 w-14 rounded-lg object-cover border border-secondary-200 flex-shrink-0"
                      />
                    ) : (
                      <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary-100 text-secondary-400 flex-shrink-0">?</span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-secondary-900 truncate">{activeProduct.name}</p>
                      <p className="text-[11px] text-secondary-400">{activeProduct.barcode ?? '—'}</p>
                      {autoValues.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {autoValues.map((val) => (
                            <span key={val} className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-600">
                              <Check className="h-2.5 w-2.5" />
                              {val}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* AutoMatched editable attrs for this product (only if unmatched) */}
              {(() => {
                const attrsForThisProduct = autoMatchedEditableAttrs.filter((attr) =>
                  autoUnmatchedProductIds[getAttrKey(attr)]?.has(activeProductId),
                );
                if (attrsForThisProduct.length === 0) return null;
                return (
                  <div className="mb-3">
                    <p className="mb-1.5 text-[11px] font-medium text-amber-600">Varyant Eşleşmesi Eksik — Manuel Giriş</p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {attrsForThisProduct.map((attr) => {
                        const attrKey = getAttrKey(attr);
                        return (
                          <div key={attr.id}>
                            {renderAttributeField(
                              attr,
                              resolveValue(attr, activeProductId),
                              (val) => handleProductValueChange(activeProductId, attrKey, val),
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {requiredAttrs.map((attr) => {
                  const attrKey = getAttrKey(attr);
                  const inherited = isInheritedValue(activeProductId, attrKey);
                  return (
                    <div key={attr.id} className={inherited ? 'relative' : ''}>
                      {renderAttributeField(
                        attr,
                        resolveValue(attr, activeProductId),
                        (val) => handleProductValueChange(activeProductId, attrKey, val),
                      )}
                      {inherited && (
                        <span className="absolute -top-1.5 right-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-medium text-blue-600">
                          kategoriden
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Optional attributes */}
      {optionalAttrs.length > 0 && marketplaceCategoryName && (
        <div>
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex items-center gap-1 text-xs font-medium text-secondary-500 hover:text-secondary-700"
          >
            {showOptional ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Opsiyonel Özellikler ({optionalAttrs.length})
          </button>

          {showOptional && (
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mode === 'category'
                ? optionalAttrs.map((attr) =>
                    renderAttributeField(
                      attr,
                      resolveValue(attr),
                      (val) => handleCategoryValueChange(getAttrKey(attr), val),
                    )
                  )
                : optionalAttrs.map((attr) => {
                    const attrKey = getAttrKey(attr);
                    const inherited = isInheritedValue(activeProductId, attrKey);
                    return (
                      <div key={attr.id} className={inherited ? 'relative' : ''}>
                        {renderAttributeField(
                          attr,
                          resolveValue(attr, activeProductId),
                          (val) => handleProductValueChange(activeProductId, attrKey, val),
                        )}
                        {inherited && (
                          <span className="absolute -top-1.5 right-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-medium text-blue-600">
                            kategoriden
                          </span>
                        )}
                      </div>
                    );
                  })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type { AttributeFormValues, PerProductValues };
