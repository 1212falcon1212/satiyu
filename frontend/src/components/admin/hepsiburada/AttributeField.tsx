'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface AttributeValue {
  id: string;
  name: string;
}

interface AttributeFieldProps {
  attributeName: string;
  attributeId?: string;
  attributeValues: AttributeValue[];
  marketplaceCategoryId?: number | null;
  type: 'enum' | 'text' | 'numeric';
  required: boolean;
  value: string;
  onChange: (value: string) => void;
}

export default function AttributeField({
  attributeName,
  attributeId,
  attributeValues,
  marketplaceCategoryId,
  type,
  required,
  value,
  onChange,
}: AttributeFieldProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [fetchedValues, setFetchedValues] = useState<AttributeValue[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch enum values on-demand when type is enum and no values provided
  useEffect(() => {
    if (
      type !== 'enum' ||
      attributeValues.length > 0 ||
      !marketplaceCategoryId ||
      !attributeId ||
      hasFetched
    ) {
      return;
    }

    setIsFetching(true);
    setHasFetched(true);

    api
      .get(`/admin/hepsiburada/categories/${marketplaceCategoryId}/attributes/${attributeId}/values`)
      .then((res) => {
        const vals = res.data?.data?.values ?? [];
        setFetchedValues(
          vals.map((v: { id?: string; value?: string; name?: string }) => ({
            id: String(v.id ?? v.value ?? ''),
            name: String(v.name ?? v.value ?? ''),
          })),
        );
      })
      .catch(() => {
        // Fetch failed — user can still type manually
      })
      .finally(() => {
        setIsFetching(false);
      });
  }, [type, attributeValues.length, marketplaceCategoryId, attributeId, hasFetched]);

  const allValues = attributeValues.length > 0 ? attributeValues : fetchedValues;

  // text or numeric → always text input
  if (type === 'text' || type === 'numeric') {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-secondary-700">
          {attributeName}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        <input
          type={type === 'numeric' ? 'number' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${attributeName} girin...`}
          className="h-9 w-full rounded-lg border border-secondary-200 bg-white px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>
    );
  }

  // enum — loading state
  if (isFetching) {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-secondary-700">
          {attributeName}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        <div className="flex h-9 items-center gap-2 rounded-lg border border-secondary-200 bg-secondary-50 px-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-secondary-400" />
          <span className="text-xs text-secondary-400">Değerler yükleniyor...</span>
        </div>
      </div>
    );
  }

  // enum with no values available → text input fallback
  if (allValues.length === 0) {
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
            Listeden seç
          </button>
        </div>
      ) : (
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
          className="h-9 w-full rounded-lg border border-secondary-200 bg-white px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="">Seçiniz...</option>
          {allValues.map((av, idx) => (
            <option key={`${av.id}-${idx}`} value={av.name}>
              {av.name}
            </option>
          ))}
          <option value="__custom__">Özel değer gir...</option>
        </select>
      )}
    </div>
  );
}
