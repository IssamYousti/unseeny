"use client";

import { useState } from "react";
import { Star } from "lucide-react";

type Props = {
  name?: string;
  defaultValue?: number;
  onChange?: (value: number) => void;
};

export default function StarPicker({ name = "rating", defaultValue = 0, onChange }: Props) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(defaultValue);

  function pick(n: number) {
    setSelected(n);
    onChange?.(n);
  }

  const active = hovered || selected;

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Star rating">
      <input type="hidden" name={name} value={selected} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => pick(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
          className="p-0.5 transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            className={`h-7 w-7 transition-colors ${
              n <= active
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
