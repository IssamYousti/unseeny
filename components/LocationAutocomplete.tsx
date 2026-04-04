"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, X, Loader2 } from "lucide-react";

export interface LocationSuggestion {
  label: string;
  city: string | null;
  state: string | null;
  country: string | null;
  display_name: string;
  lat: number;
  lon: number;
}

interface Props {
  placeholder?: string;
  /** Initial display label (from URL param) */
  defaultLabel?: string;
  /** Called when user selects a suggestion or clears the field */
  onChange: (suggestion: LocationSuggestion | null) => void;
}

export default function LocationAutocomplete({
  placeholder = "City, country or region…",
  defaultLabel = "",
  onChange,
}: Props) {
  const [input, setInput] = useState(defaultLabel);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<LocationSuggestion | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data: LocationSuggestion[] = await res.json();
      setSuggestions(data);
      setOpen(data.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInput(val);
    setSelected(null);
    onChange(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 320);
  }

  function handleSelect(s: LocationSuggestion) {
    setInput(s.label);
    setSelected(s);
    setSuggestions([]);
    setOpen(false);
    onChange(s);
  }

  function handleClear() {
    setInput("");
    setSelected(null);
    setSuggestions([]);
    setOpen(false);
    onChange(null);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={input}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-background border border-border rounded-lg pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
        )}
        {!loading && input && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden text-sm">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={() => handleSelect(s)}
                className="w-full text-left px-3 py-2.5 hover:bg-accent hover:text-accent-foreground transition flex items-start gap-2"
              >
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <span>{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Hidden inputs so the form can read the structured location data */}
      <input type="hidden" name="location" value={selected?.label ?? input} />
      <input type="hidden" name="locationCity" value={selected?.city ?? ""} />
      <input type="hidden" name="locationCountry" value={selected?.country ?? ""} />
    </div>
  );
}
