"use client";

import { useState, useRef, useCallback } from "react";

const PRICE_MIN = 0;
const PRICE_MAX = 2000;
const STEP = 25;

type Props = {
  defaultMin?: number;
  defaultMax?: number;
  label: string;
};

export default function PriceRangeSlider({ defaultMin, defaultMax, label }: Props) {
  const [minVal, setMinVal] = useState(defaultMin ?? PRICE_MIN);
  const [maxVal, setMaxVal] = useState(defaultMax ?? PRICE_MAX);

  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);

  const minPercent = Math.round(((minVal - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100);
  const maxPercent = Math.round(((maxVal - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100);

  const handleMin = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.min(Number(e.target.value), maxVal - STEP);
    setMinVal(v);
  }, [maxVal]);

  const handleMax = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.max(Number(e.target.value), minVal + STEP);
    setMaxVal(v);
  }, [minVal]);

  const displayMin = minVal <= PRICE_MIN ? "€0" : `€${minVal}`;
  const displayMax = maxVal >= PRICE_MAX ? "No limit" : `€${maxVal}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </label>
        <span className="text-xs text-muted-foreground font-medium tabular-nums">
          {displayMin} — {displayMax}
        </span>
      </div>

      {/* Slider track */}
      <div className="relative flex items-center h-6">
        {/* Background track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-border" />

        {/* Active range fill */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-primary transition-all"
          style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
        />

        {/* Min range input */}
        <input
          ref={minRef}
          type="range"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={STEP}
          value={minVal}
          onChange={handleMin}
          className="price-range-thumb absolute inset-x-0 h-1.5 w-full appearance-none bg-transparent"
        />

        {/* Max range input */}
        <input
          ref={maxRef}
          type="range"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={STEP}
          value={maxVal}
          onChange={handleMax}
          className="price-range-thumb absolute inset-x-0 h-1.5 w-full appearance-none bg-transparent"
        />
      </div>

      {/* Price labels below */}
      <div className="flex justify-between text-xs text-muted-foreground/60">
        <span>€0</span>
        <span>€{PRICE_MAX}+</span>
      </div>

      {/* Hidden form fields */}
      <input type="hidden" name="minPrice" value={minVal > PRICE_MIN ? String(minVal) : ""} />
      <input type="hidden" name="maxPrice" value={maxVal < PRICE_MAX ? String(maxVal) : ""} />
    </div>
  );
}
