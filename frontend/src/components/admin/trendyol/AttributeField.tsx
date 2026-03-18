'use client';

import { useState } from 'react';
import type { TrendyolAttributeValue } from '@/types/api';

interface AttributeFieldProps {
  attributeName: string;
  attributeValues: TrendyolAttributeValue[];
  allowCustom: boolean;
  required: boolean;
  value: string;
  onChange: (value: string) => void;
}

export default function AttributeField({
  attributeName,
  attributeValues,
  allowCustom,
  required,
  value,
  onChange,
}: AttributeFieldProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);

  const hasValues = attributeValues.length > 0;

  // If no predefined values but allowCustom, show text input directly
  if (!hasValues && allowCustom) {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-secondary-700">
          {attributeName}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${attributeName} girin...`}
          className="h-9 w-full rounded-lg border border-secondary-200 bg-white px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>
    );
  }

  // If no values and no custom allowed
  if (!hasValues && !allowCustom) {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-secondary-700">
          {attributeName}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        <p className="text-xs text-secondary-400 italic">Deger listesi yok</p>
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-secondary-700">
        {attributeName}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>

      {showCustomInput ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`${attributeName} girin...`}
            className="h-9 flex-1 rounded-lg border border-secondary-200 bg-white px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <button
            type="button"
            onClick={() => {
              setShowCustomInput(false);
              onChange('');
            }}
            className="h-9 rounded-lg border border-secondary-200 px-3 text-xs text-secondary-500 hover:bg-secondary-50"
          >
            Listeden sec
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <select
            value={value}
            onChange={(e) => {
              if (e.target.value === '__custom__') {
                setShowCustomInput(true);
                onChange('');
              } else {
                onChange(e.target.value);
              }
            }}
            className="h-9 flex-1 rounded-lg border border-secondary-200 bg-white px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">Seciniz...</option>
            {attributeValues.map((av) => (
              <option key={av.id} value={av.name}>
                {av.name}
              </option>
            ))}
            {allowCustom && (
              <option value="__custom__">Ozel deger gir...</option>
            )}
          </select>
        </div>
      )}
    </div>
  );
}
