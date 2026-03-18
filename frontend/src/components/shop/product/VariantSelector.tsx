'use client';

import type { ProductVariant } from '@/types/api';
import { cn } from '@/lib/utils';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selected: ProductVariant | null;
  onSelect: (variant: ProductVariant) => void;
}

interface GroupedOption {
  typeName: string;
  displayType: string;
  values: { value: string; colorCode: string | null; available: boolean }[];
}

function groupVariantOptions(variants: ProductVariant[]): GroupedOption[] {
  const groups = new Map<string, GroupedOption>();

  for (const variant of variants) {
    for (const vv of variant.variantValues) {
      let group = groups.get(vv.typeName);
      if (!group) {
        group = { typeName: vv.typeName, displayType: vv.displayType, values: [] };
        groups.set(vv.typeName, group);
      }
      const exists = group.values.find((v) => v.value === vv.optionValue);
      if (!exists) {
        group.values.push({
          value: vv.optionValue,
          colorCode: vv.colorCode,
          available: variant.isActive && variant.stockQuantity > 0,
        });
      } else if (variant.isActive && variant.stockQuantity > 0) {
        exists.available = true;
      }
    }
  }

  return Array.from(groups.values());
}

export function VariantSelector({ variants, selected, onSelect }: VariantSelectorProps) {
  const groups = groupVariantOptions(variants);

  const selectedValues: Record<string, string> = {};
  if (selected) {
    for (const vv of selected.variantValues) {
      selectedValues[vv.typeName] = vv.optionValue;
    }
  }

  const handleOptionClick = (typeName: string, value: string) => {
    const newSelection = { ...selectedValues, [typeName]: value };

    // Find the matching variant
    const match = variants.find((v) =>
      v.variantValues.every(
        (vv) => newSelection[vv.typeName] === vv.optionValue
      )
    );

    if (match) {
      onSelect(match);
    } else {
      // Find the closest match (change only this type)
      const partial = variants.find((v) =>
        v.variantValues.some((vv) => vv.typeName === typeName && vv.optionValue === value)
      );
      if (partial) onSelect(partial);
    }
  };

  if (variants.length === 0) return null;

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.typeName}>
          <p className="mb-2 text-sm font-medium text-secondary-700">
            {group.typeName}
            {selectedValues[group.typeName] && (
              <span className="ml-1 text-secondary-500">: {selectedValues[group.typeName]}</span>
            )}
          </p>

          <div className="flex flex-wrap gap-2">
            {group.values.map((opt) => {
              const isSelected = selectedValues[group.typeName] === opt.value;
              const isColor = group.displayType === 'color' && opt.colorCode;

              if (isColor) {
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleOptionClick(group.typeName, opt.value)}
                    disabled={!opt.available}
                    title={opt.value}
                    className={cn(
                      'h-9 w-9 rounded-full border-2 transition-all',
                      isSelected
                        ? 'border-primary-500 ring-2 ring-primary-200'
                        : 'border-secondary-200 hover:border-secondary-400',
                      !opt.available && 'opacity-30 cursor-not-allowed'
                    )}
                    style={{ backgroundColor: opt.colorCode! }}
                  />
                );
              }

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleOptionClick(group.typeName, opt.value)}
                  disabled={!opt.available}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                    isSelected
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-secondary-200 text-secondary-700 hover:border-secondary-400',
                    !opt.available && 'opacity-40 cursor-not-allowed line-through'
                  )}
                >
                  {opt.value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
