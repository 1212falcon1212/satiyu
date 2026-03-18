'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuantityPickerProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function QuantityPicker({ value, onChange, min = 1, max = 99, className }: QuantityPickerProps) {
  const decrement = () => {
    if (value > min) onChange(value - 1);
  };

  const increment = () => {
    if (value < max) onChange(value + 1);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10);
    if (!isNaN(num)) {
      onChange(Math.max(min, Math.min(max, num)));
    }
  };

  return (
    <div className={cn('inline-flex items-center rounded-lg border border-secondary-200', className)}>
      <button
        type="button"
        onClick={decrement}
        disabled={value <= min}
        className="flex h-10 w-10 items-center justify-center text-secondary-600 hover:bg-secondary-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-l-lg"
        aria-label="Azalt"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        type="number"
        value={value}
        onChange={handleInput}
        min={min}
        max={max}
        className="h-10 w-12 border-x border-secondary-200 text-center text-sm font-medium text-secondary-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={increment}
        disabled={value >= max}
        className="flex h-10 w-10 items-center justify-center text-secondary-600 hover:bg-secondary-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-r-lg"
        aria-label="Artir"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
