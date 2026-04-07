"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, Search } from "lucide-react";

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    country?: string;
    type?: string;
  };
};

type Suggestion = {
  label: string;
  street: string;
  houseNumber: string;
  zipCode: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
};

function parseFeature(f: PhotonFeature): Suggestion | null {
  const p = f.properties;
  const [lng, lat] = f.geometry.coordinates;

  const street = p.street ?? "";
  const houseNumber = p.housenumber ?? "";
  const zipCode = p.postcode ?? "";
  const city = p.city ?? p.district ?? p.county ?? p.state ?? "";
  const country = p.country ?? "";

  if (!city && !street) return null;

  const parts = [
    houseNumber ? `${street} ${houseNumber}` : street || undefined,
    zipCode,
    city,
    country,
  ].filter(Boolean);

  return { label: parts.join(", "), street, houseNumber, zipCode, city, country, lat, lng };
}

type Props = {
  defaults?: {
    street?: string;
    houseNumber?: string;
    addition?: string;
    zipCode?: string;
    city?: string;
    country?: string;
  };
  labels: {
    search: string;
    street: string;
    houseNumber: string;
    addition: string;
    additionPlaceholder: string;
    zip: string;
    zipPlaceholder: string;
    city: string;
    country: string;
  };
};

export default function AddressAutocomplete({ defaults = {}, labels }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const [street, setStreet] = useState(defaults.street ?? "");
  const [houseNumber, setHouseNumber] = useState(defaults.houseNumber ?? "");
  const [addition, setAddition] = useState(defaults.addition ?? "");
  const [zipCode, setZipCode] = useState(defaults.zipCode ?? "");
  const [city, setCity] = useState(defaults.city ?? "");
  const [country, setCountry] = useState(defaults.country ?? "");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [detectedTimezone, setDetectedTimezone] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = await res.json();
        const parsed = (data.features as PhotonFeature[])
          .map(parseFeature)
          .filter((s): s is Suggestion => s !== null)
          .filter((s, i, arr) => arr.findIndex((x) => x.label === s.label) === i);
        setSuggestions(parsed);
        setOpen(parsed.length > 0);
      } catch {
        // silently fail — manual entry still works
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query]);

  async function selectSuggestion(s: Suggestion) {
    setStreet(s.street);
    setHouseNumber(s.houseNumber);
    setZipCode(s.zipCode);
    setCity(s.city);
    setCountry(s.country);
    setLat(String(s.lat));
    setLng(String(s.lng));
    setQuery("");
    setOpen(false);
    setSuggestions([]);

    // Detect timezone from coordinates and broadcast to other components on the page
    try {
      const res = await fetch(
        `https://timeapi.io/api/Time/current/coordinate?latitude=${s.lat}&longitude=${s.lng}`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const data = await res.json();
        const tz: string = data.timeZone;
        if (tz) {
          setDetectedTimezone(tz);
          window.dispatchEvent(new CustomEvent("unseeny:timezone-detected", { detail: tz }));
        }
      }
    } catch {
      // silently ignore — server will detect on save
    }
  }

  const inputClass =
    "w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="space-y-4">
      {/* Search field */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin z-10" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={labels.search}
          autoComplete="off"
          className="w-full pl-9 pr-9 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="mt-1.5 text-xs text-muted-foreground/50">
          Search fills in city, postcode and country. Enter street and house number manually below.
        </p>

        {open && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                // onMouseDown + preventDefault prevents the input from blurring
                // before the selection is registered — fixes the "click does nothing" bug
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(s);
                }}
                className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors"
              >
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hidden fields submitted with the form */}
      <input type="hidden" name="latitude" value={lat} />
      <input type="hidden" name="longitude" value={lng} />
      <input type="hidden" name="detected_timezone" value={detectedTimezone} />

      {/* Address fields — city/postcode/country filled by autocomplete; street + number entered manually */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{labels.city}</label>
          <input name="city" value={city} onChange={(e) => setCity(e.target.value)} required className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{labels.country}</label>
          <input name="country" value={country} onChange={(e) => setCountry(e.target.value)} required className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{labels.zip}</label>
          <input name="zip_code" value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder={labels.zipPlaceholder} required className={inputClass} />
        </div>
        <div className="space-y-1.5 sm:col-span-2 sm:grid sm:grid-cols-2 sm:gap-4 contents">
          {/* Street spans wider on larger screens */}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium">{labels.street}</label>
          <input name="street" value={street} onChange={(e) => setStreet(e.target.value)} required className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{labels.houseNumber}</label>
          <input name="house_number" value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} required className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{labels.addition}</label>
          <input name="house_number_addition" value={addition} onChange={(e) => setAddition(e.target.value)} placeholder={labels.additionPlaceholder} className={inputClass} />
        </div>
      </div>
    </div>
  );
}
