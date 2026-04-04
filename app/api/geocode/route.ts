import { NextRequest, NextResponse } from "next/server";

// Proxy for Nominatim (OpenStreetMap) geocoding.
// Nominatim requires a descriptive User-Agent and max 1 req/s — we add
// a short cache so repeated keystrokes don't hammer the API.

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  const url = new URL(NOMINATIM);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");
  // Bias toward places (cities, countries, states) rather than POIs
  url.searchParams.set("featuretype", "city,country,state,settlement");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Unseeny/1.0 (platform for private property rentals)",
      "Accept-Language": "en",
    },
    next: { revalidate: 300 }, // cache 5 min
  });

  if (!res.ok) return NextResponse.json([]);

  const raw: NominatimResult[] = await res.json();

  // Shape the results for the autocomplete
  const suggestions = raw
    .filter((r) => r.address)
    .map((r) => {
      const a = r.address!;
      const city =
        a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? null;
      const country = a.country ?? null;
      const state = a.state ?? null;

      // Build a short display label: "City, Country" or "Country" or "Region, Country"
      const parts: string[] = [];
      if (city) parts.push(city);
      else if (state) parts.push(state);
      if (country) parts.push(country);

      return {
        label: parts.join(", ") || r.display_name,
        city,
        state,
        country,
        display_name: r.display_name,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
      };
    })
    // Deduplicate by label
    .filter(
      (item, idx, arr) => arr.findIndex((x) => x.label === item.label) === idx,
    );

  return NextResponse.json(suggestions);
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}
