'use client';

import { useState, useMemo, useCallback } from 'react';
import { Check, ChevronDown, ChevronRight, Copy, ArrowRight, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AttributeField from './AttributeField';
import type { TrendyolCategoryAttribute, PrepareSendProduct } from '@/types/api';

interface AttributeFormValues {
  [attributeKey: string]: string;
}

interface PerProductValues {
  [productId: number]: AttributeFormValues;
}

interface CategoryAttributeFormProps {
  localCategoryName: string;
  marketplaceCategoryName: string | null;
  products: PrepareSendProduct[];
  categoryAttributes: TrendyolCategoryAttribute[];
  /** Category-level attribute values (shared across all products) */
  categoryValues: AttributeFormValues;
  onCategoryValuesChange: (values: AttributeFormValues) => void;
  /** Per-product attribute values */
  perProductValues: PerProductValues;
  onPerProductValuesChange: (values: PerProductValues) => void;
}

function getAttrKey(attr: TrendyolCategoryAttribute): string {
  return attr.attribute?.name ?? attr.name ?? '';
}

function getAttrId(attr: TrendyolCategoryAttribute): number {
  return attr.attribute?.id ?? attr.id ?? 0;
}

export default function CategoryAttributeForm({
  localCategoryName,
  marketplaceCategoryName,
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
  const [productFilter, setProductFilter] = useState<'all' | 'complete' | 'incomplete'>('all');

  // Copy category values into per-product values when switching to product mode
  const switchToProductMode = useCallback(() => {
    const newPerProduct = { ...perProductValues };
    for (const product of products) {
      const existing = newPerProduct[product.id] ?? {};
      // Category values as base, existing per-product values take precedence
      newPerProduct[product.id] = { ...categoryValues, ...existing };
    }
    onPerProductValuesChange(newPerProduct);
    setMode('product');
  }, [categoryValues, perProductValues, products, onPerProductValuesChange]);

  const switchToCategoryMode = useCallback(() => {
    setMode('category');
  }, []);

  const { autoMatchedAttrs, autoMatchedEditableAttrs, requiredAttrs, optionalAttrs, autoUnmatchedProductIds } = useMemo(() => {
    const autoFull: TrendyolCategoryAttribute[] = []; // all products matched - info only
    const autoEditable: TrendyolCategoryAttribute[] = []; // some products unmatched - needs editing
    const req: TrendyolCategoryAttribute[] = [];
    const opt: TrendyolCategoryAttribute[] = [];
    const unmatchedMap: Record<string, Set<number>> = {};

    for (const attr of categoryAttributes) {
      if (attr.autoMatched) {
        const attrKeyLower = getAttrKey(attr).toLowerCase();
        const unmatched = new Set<number>();
        for (const p of products) {
          const hasValue = p.existingAttributes.some(
            (ea) => ea.attribute_name.toLowerCase() === attrKeyLower && ea.attribute_value,
          );
          if (!hasValue) unmatched.add(p.id);
        }
        unmatchedMap[getAttrKey(attr)] = unmatched;

        if (unmatched.size > 0) {
          autoEditable.push(attr);
        } else {
          autoFull.push(attr);
        }
      } else if (attr.required) {
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

  // Check if any category values have been filled
  const hasCategoryValues = useMemo(() => {
    return Object.values(categoryValues).some((v) => v && v.trim() !== '');
  }, [categoryValues]);

  // Track which values are inherited from category (not yet edited per-product)
  const isInheritedValue = useCallback((productId: number, attrKey: string): boolean => {
    if (mode !== 'product') return false;
    const perVal = perProductValues[productId]?.[attrKey];
    const catVal = categoryValues[attrKey];
    return !!perVal && !!catVal && perVal === catVal;
  }, [mode, perProductValues, categoryValues]);

  // Count filled/total required attributes per product
  const productProgress = useMemo(() => {
    const progress: Record<number, { filled: number; total: number }> = {};
    for (const product of products) {
      let filled = 0;
      let total = requiredAttrs.length;

      for (const attr of requiredAttrs) {
        const key = getAttrKey(attr);
        const perVal = perProductValues[product.id]?.[key];
        const catVal = categoryValues[key];
        if ((perVal && perVal.trim() !== '') || (catVal && catVal.trim() !== '')) filled++;
      }

      // Also count autoMatched editable attrs for unmatched products
      for (const attr of autoMatchedEditableAttrs) {
        if (!attr.required) continue;
        const attrKey = getAttrKey(attr);
        const unmatched = autoUnmatchedProductIds[attrKey];
        if (unmatched?.has(product.id)) {
          total++;
          const perVal = perProductValues[product.id]?.[attrKey];
          const catVal = categoryValues[attrKey];
          if ((perVal && perVal.trim() !== '') || (catVal && catVal.trim() !== '')) filled++;
        }
      }

      progress[product.id] = { filled, total };
    }
    return progress;
  }, [products, requiredAttrs, autoMatchedEditableAttrs, autoUnmatchedProductIds, perProductValues, categoryValues]);

  // Filtered products for product mode tabs
  const { filteredProducts, completeCount, incompleteCount } = useMemo(() => {
    let complete = 0;
    let incomplete = 0;
    for (const p of products) {
      const prog = productProgress[p.id];
      if (prog && prog.filled === prog.total) complete++;
      else incomplete++;
    }

    let filtered = products;
    if (productFilter === 'complete') {
      filtered = products.filter((p) => {
        const prog = productProgress[p.id];
        return prog && prog.filled === prog.total;
      });
    } else if (productFilter === 'incomplete') {
      filtered = products.filter((p) => {
        const prog = productProgress[p.id];
        return !prog || prog.filled < prog.total;
      });
    }

    return { filteredProducts: filtered, completeCount: complete, incompleteCount: incomplete };
  }, [products, productProgress, productFilter]);

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
    attr: TrendyolCategoryAttribute,
    value: string,
    onChangeValue: (val: string) => void,
  ) => {
    const attrName = getAttrKey(attr);
    return (
      <AttributeField
        key={attrName}
        attributeName={attrName}
        attributeValues={attr.attributeValues ?? []}
        allowCustom={attr.allowCustom ?? false}
        required={attr.required ?? false}
        value={value}
        onChange={onChangeValue}
      />
    );
  };

  // Resolve value: in category mode use categoryValues, in product mode use perProductValues with categoryValues fallback
  const resolveValue = (attr: TrendyolCategoryAttribute, productId?: number): string => {
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

        {/* Mode toggle */}
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
                Kategori Bazli
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

      {/* Auto-matched attributes */}
      {autoMatchedAttrs.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="mb-2 text-xs font-medium text-emerald-700">Otomatik Eşleşen Özellikler</p>
          <div className="space-y-2">
            {autoMatchedAttrs.map((attr) => {
              const attrKey = getAttrKey(attr);
              const attrKeyLower = attrKey.toLowerCase();

              // Collect per-product resolved values for this attribute (including all variant values)
              const valueCounts: Record<string, number> = {};
              let missingCount = 0;
              for (const p of products) {
                const matchingEntries = p.existingAttributes.filter(
                  (ea) => ea.attribute_name.toLowerCase() === attrKeyLower && ea.attribute_value,
                );
                if (matchingEntries.length > 0) {
                  for (const entry of matchingEntries) {
                    valueCounts[entry.attribute_value] = (valueCounts[entry.attribute_value] || 0) + 1;
                  }
                } else {
                  missingCount++;
                }
              }

              const uniqueValues = Object.entries(valueCounts).sort((a, b) => b[1] - a[1]);

              return (
                <div key={attrKey}>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                    <Check className="h-3 w-3" />
                    {attrKey}
                    <span className="text-emerald-500">({attr.autoMatchSource === 'variant' ? 'Varyant' : 'Otomatik'})</span>
                  </span>
                  {uniqueValues.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1 pl-1">
                      {uniqueValues.map(([val, count]) => (
                        <span key={val} className="inline-flex items-center gap-0.5 rounded bg-emerald-100/70 px-1.5 py-0.5 text-[10px] text-emerald-700">
                          {val} <span className="text-emerald-500">({count})</span>
                        </span>
                      ))}
                      {missingCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                          Tespit edilemedi <span className="text-amber-500">({missingCount})</span>
                        </span>
                      )}
                      {(() => {
                        const unmatched = autoUnmatchedProductIds[attrKey];
                        const unmatchedCount = unmatched?.size ?? 0;
                        if (unmatchedCount === 0) return null;
                        return (
                          <span className="inline-flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">
                            Varyant tipi yok <span className="text-red-500">({unmatchedCount})</span>
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No mappable category */}
      {!marketplaceCategoryName && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">
            Bu kategori için Trendyol kategori eşleşmesi bulunamadı. Öncelikle kategori eşleştirmesi yapın.
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
              {/* AutoMatched editable attrs — shown first so user sees them immediately */}
              {autoMatchedEditableAttrs.map((attr) => {
                const attrKey = getAttrKey(attr);
                const unmatched = autoUnmatchedProductIds[attrKey];
                return (
                  <div key={attrKey}>
                    {renderAttributeField(
                      attr,
                      categoryValues[attrKey] ?? '',
                      (val) => handleCategoryValueChange(attrKey, val),
                    )}
                    <p className="mt-1 text-[10px] text-amber-600">
                      {unmatched?.size ?? 0}/{products.length} üründe eksik
                    </p>
                  </div>
                );
              })}

              {/* Regular required attrs */}
              {requiredAttrs.map((attr) => {
                const attrKey = getAttrKey(attr);
                const attrKeyLower = attrKey.toLowerCase();
                const isColorAttr = attrKeyLower === 'renk' || attrKeyLower === 'web color';

                // Ürün bazlı auto-detect edilen renk sayısı
                const autoDetectedCount = isColorAttr
                  ? products.filter((p) => perProductValues[p.id]?.[attrKey]).length
                  : 0;

                const currentCatValue = categoryValues[attrKey] ?? '';

                if (isColorAttr && autoDetectedCount > 0 && !currentCatValue) {
                  return (
                    <div key={attrKey}>
                      {renderAttributeField(
                        attr,
                        currentCatValue,
                        (val) => handleCategoryValueChange(attrKey, val),
                      )}
                      <div className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <p className="text-xs font-medium text-amber-700">
                          Ürün bilgisinden gelen değer sayısı: {autoDetectedCount}
                        </p>
                        <p className="text-[11px] text-amber-600 mt-0.5">
                          Lütfen ürün bazlı renkleri kontrol ediniz
                        </p>
                      </div>
                    </div>
                  );
                }

                return renderAttributeField(
                  attr,
                  resolveValue(attr),
                  (val) => handleCategoryValueChange(attrKey, val),
                );
              })}
            </div>
          ) : (
            <div>
              {/* Info about inherited values */}
              {hasCategoryValues && (
                <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                  <p className="text-xs text-blue-700">
                    Kategori bazlı girilen değerler tüm ürünlere kopyalandı. Sadece farklı olan özellikleri değiştirin (örneğin Renk, Web Color).
                  </p>
                </div>
              )}

              {/* Product filter */}
              <div className="mb-3 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-secondary-400" />
                {([
                  { key: 'all' as const, label: 'Tümü', count: products.length },
                  { key: 'incomplete' as const, label: 'Eksik', count: incompleteCount },
                  { key: 'complete' as const, label: 'Hazır', count: completeCount },
                ]).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => {
                      setProductFilter(f.key);
                      // Aktif ürün filtrede yoksa ilk filtrelenen ürüne geç
                      const willFilter = f.key === 'complete'
                        ? products.filter((p) => { const pr = productProgress[p.id]; return pr && pr.filled === pr.total; })
                        : f.key === 'incomplete'
                          ? products.filter((p) => { const pr = productProgress[p.id]; return !pr || pr.filled < pr.total; })
                          : products;
                      if (willFilter.length > 0 && !willFilter.find((p) => p.id === activeProductId)) {
                        setActiveProductId(willFilter[0].id);
                      }
                    }}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      productFilter === f.key
                        ? f.key === 'incomplete' ? 'bg-amber-100 text-amber-700' : f.key === 'complete' ? 'bg-emerald-100 text-emerald-700' : 'bg-secondary-200 text-secondary-700'
                        : 'text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100'
                    }`}
                  >
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>

              {/* Product tabs with image + progress */}
              <div className="mb-3 flex gap-1 overflow-x-auto border-b border-secondary-200 pb-px">
                {filteredProducts.map((p) => {
                  const prog = productProgress[p.id];
                  const isComplete = prog && prog.filled === prog.total;

                  // Find auto-matched color values for this product
                  const colorAttr = [...autoMatchedAttrs, ...autoMatchedEditableAttrs].find(
                    (a) => getAttrKey(a).toLowerCase() === 'renk',
                  );
                  const colorValues = colorAttr
                    ? p.existingAttributes
                        .filter((ea) => ea.attribute_name.toLowerCase() === 'renk' && ea.attribute_value)
                        .map((ea) => ea.attribute_value)
                    : [];
                  const colorValue = colorValues.length > 0 ? colorValues.join(', ') : null;

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
                      {colorValue && (
                        <span className="inline-flex items-center rounded bg-emerald-50 px-1 py-0.5 text-[9px] text-emerald-600 border border-emerald-200">
                          {colorValue}
                        </span>
                      )}
                      {colorAttr && !colorValue && (
                        <span className="inline-flex items-center rounded bg-red-50 px-1 py-0.5 text-[9px] text-red-500 border border-red-200">
                          Renk?
                        </span>
                      )}
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

                // Resolve auto-matched attribute values for this product (all variant values)
                const autoValues = [...autoMatchedAttrs, ...autoMatchedEditableAttrs].map((attr) => {
                  const attrKey = getAttrKey(attr);
                  const matches = activeProduct.existingAttributes.filter(
                    (ea) => ea.attribute_name.toLowerCase() === attrKey.toLowerCase() && ea.attribute_value,
                  );
                  const values = matches.map((m) => m.attribute_value);
                  return { name: attrKey, value: values.length > 0 ? values.join(', ') : null };
                });

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
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-secondary-900 truncate">{activeProduct.name}</p>
                      <p className="text-[11px] text-secondary-400">{activeProduct.barcode ?? '—'}</p>
                      {autoValues.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {autoValues.map((av) => (
                            <span
                              key={av.name}
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                av.value
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-red-50 text-red-600 border border-red-200'
                              }`}
                            >
                              {av.name}: {av.value ?? 'Tespit edilemedi'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {requiredAttrs.map((attr) => {
                  const attrKey = getAttrKey(attr);
                  const inherited = isInheritedValue(activeProductId, attrKey);
                  return (
                    <div key={attrKey} className={inherited ? 'relative' : ''}>
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

              {/* AutoMatched editable attributes — only for products that are actually missing values */}
              {(() => {
                const attrsForThisProduct = autoMatchedEditableAttrs.filter((attr) =>
                  autoUnmatchedProductIds[getAttrKey(attr)]?.has(activeProductId),
                );
                if (attrsForThisProduct.length === 0) return null;
                return (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {attrsForThisProduct.map((attr) => {
                      const attrKey = getAttrKey(attr);
                      const inherited = isInheritedValue(activeProductId, attrKey);
                      return (
                        <div key={attrKey} className="relative">
                          {renderAttributeField(
                            attr,
                            resolveValue(attr, activeProductId),
                            (val) => handleProductValueChange(activeProductId, attrKey, val),
                          )}
                          {!inherited && (
                            <span className="absolute -top-1.5 right-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-medium text-amber-600">
                              eksik
                            </span>
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
                );
              })()}
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
                      <div key={attrKey} className={inherited ? 'relative' : ''}>
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
