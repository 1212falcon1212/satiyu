'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface PriceRangeFilterProps {
  minPrice?: string;
  maxPrice?: string;
  onApply: (min: string, max: string) => void;
}

const RANGE_MIN = 0;
const RANGE_MAX = 5000;

export function PriceRangeFilter({ minPrice = '', maxPrice = '', onApply }: PriceRangeFilterProps) {
  const [min, setMin] = useState(minPrice ? Number(minPrice) : RANGE_MIN);
  const [max, setMax] = useState(maxPrice ? Number(maxPrice) : RANGE_MAX);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (minPrice) setMin(Number(minPrice));
    if (maxPrice) setMax(Number(maxPrice));
  }, [minPrice, maxPrice]);

  const getPercent = useCallback((val: number) => {
    return ((val - RANGE_MIN) / (RANGE_MAX - RANGE_MIN)) * 100;
  }, []);

  const handleApply = () => {
    onApply(
      min > RANGE_MIN ? String(min) : '',
      max < RANGE_MAX ? String(max) : ''
    );
  };

  return (
    <div>
      <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-secondary-900 border-b-2 border-accent pb-2">
        Fiyat Aralığı
      </h4>

      {/* Dual range slider */}
      <div className="relative mt-4 mb-6 h-2" ref={trackRef}>
        {/* Track background */}
        <div className="absolute inset-0 rounded-full bg-secondary-200" />
        {/* Active track */}
        <div
          className="absolute h-full rounded-full bg-accent"
          style={{
            left: `${getPercent(min)}%`,
            width: `${getPercent(max) - getPercent(min)}%`,
          }}
        />
        {/* Min thumb */}
        <input
          type="range"
          min={RANGE_MIN}
          max={RANGE_MAX}
          step={10}
          value={min}
          onChange={(e) => {
            const val = Math.min(Number(e.target.value), max - 10);
            setMin(val);
          }}
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
          style={{ zIndex: min > RANGE_MAX - 100 ? 5 : 3 }}
        />
        {/* Max thumb */}
        <input
          type="range"
          min={RANGE_MIN}
          max={RANGE_MAX}
          step={10}
          value={max}
          onChange={(e) => {
            const val = Math.max(Number(e.target.value), min + 10);
            setMax(val);
          }}
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
          style={{ zIndex: 4 }}
        />
      </div>

      {/* Price display */}
      <p className="text-sm text-secondary-600 mb-3">
        Fiyat: <span className="font-semibold text-secondary-900">{min} ₺</span> — <span className="font-semibold text-secondary-900">{max} ₺</span>
      </p>

      <button
        type="button"
        onClick={handleApply}
        className="w-full rounded-sm bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-600 transition-colors"
      >
        Uygula
      </button>
    </div>
  );
}
