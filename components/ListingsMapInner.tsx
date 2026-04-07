"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { Star, Lock } from "lucide-react";

export type MapListing = {
  id: string;
  title: string;
  city: string;
  country: string;
  price_per_night: number;
  latitude: number;
  longitude: number;
  cover_image_url: string | null;
  avg_rating: number | null;
  review_count: number;
};

function createPriceIcon(price: number, selected: boolean) {
  const bg = selected ? "#0f172a" : "#ffffff";
  const color = selected ? "#ffffff" : "#0f172a";
  const shadow = selected
    ? "0 4px 16px rgba(0,0,0,0.35)"
    : "0 2px 8px rgba(0,0,0,0.18)";
  const scale = selected ? "scale(1.12)" : "scale(1)";
  const border = selected ? "#0f172a" : "rgba(0,0,0,0.13)";

  const html = `<div style="
    background:${bg};
    color:${color};
    border:1.5px solid ${border};
    border-radius:20px;
    padding:5px 11px;
    font-size:12.5px;
    font-weight:700;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    white-space:nowrap;
    box-shadow:${shadow};
    cursor:pointer;
    transform:${scale};
    transition:all .15s ease;
    user-select:none;
    letter-spacing:-.01em;
  ">€${price}</div>`;

  return L.divIcon({
    html,
    className: "",
    iconSize: [60, 30],
    iconAnchor: [30, 15],
    popupAnchor: [0, -20],
  });
}

/** Re-fits the map when the listing set changes */
function FitBounds({ listings }: { listings: MapListing[] }) {
  const map = useMap();
  useEffect(() => {
    if (listings.length === 0) return;
    const bounds = L.latLngBounds(listings.map((l) => [l.latitude, l.longitude]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings.length]);
  return null;
}

/** Flies to a specific location (used when a location filter is active) */
function FlyToCenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], zoom]);
  return null;
}

export default function ListingsMapInner({
  listings,
  center,
  zoom,
}: {
  listings: MapListing[];
  center?: [number, number];
  zoom?: number;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Initial center: use provided center, first listing, or Europe
  const initialCenter: [number, number] =
    center ?? (listings.length > 0
      ? [listings[0].latitude, listings[0].longitude]
      : [48.8566, 2.3522]);

  return (
    <MapContainer
      center={initialCenter}
      zoom={zoom ?? 5}
      scrollWheelZoom
      zoomControl={false}
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        maxZoom={19}
      />

      {center
        ? <FlyToCenter center={center} zoom={zoom ?? 10} />
        : <FitBounds listings={listings} />
      }

      {/* Zoom control — bottom right */}
      {/* react-leaflet renders default zoom at top-left; we hide it via zoomControl=false */}

      {listings.map((listing) => (
        <Marker
          key={listing.id}
          position={[listing.latitude, listing.longitude]}
          icon={createPriceIcon(listing.price_per_night, selectedId === listing.id)}
          eventHandlers={{ click: () => setSelectedId(listing.id) }}
        >
          <Popup
            offset={[0, -8]}
            closeButton={false}
            className="listing-map-popup"
            eventHandlers={{ remove: () => setSelectedId(null) }}
          >
            <PopupCard listing={listing} />
          </Popup>
        </Marker>
      ))}

      {/* Popup styles injected once */}
      <style>{`
        .listing-map-popup .leaflet-popup-content-wrapper {
          padding: 0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          border: 1px solid rgba(0,0,0,0.06);
        }
        .listing-map-popup .leaflet-popup-content {
          margin: 0;
          width: 220px !important;
        }
        .listing-map-popup .leaflet-popup-tip-container { display: none; }
      `}</style>
    </MapContainer>
  );
}

function PopupCard({ listing }: { listing: MapListing }) {
  return (
    <div style={{ width: 220, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Image */}
      <div style={{ height: 130, background: "linear-gradient(135deg, #e0e7ff 0%, #f0fdf4 100%)", position: "relative", overflow: "hidden" }}>
        {listing.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.cover_image_url}
            alt={listing.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 6 }}>
            <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: "50%", padding: 8 }}>
              <Lock size={16} color="#6366f1" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "12px 14px 14px" }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, lineHeight: "1.3", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {listing.title}
        </p>
        <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "#64748b", lineHeight: "1.4" }}>
          {listing.city}, {listing.country}
        </p>

        {listing.avg_rating !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, margin: "5px 0 0" }}>
            <Star size={11} fill="#f59e0b" color="#f59e0b" />
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "#0f172a" }}>{listing.avg_rating.toFixed(1)}</span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>({listing.review_count})</span>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
            €{listing.price_per_night}
            <span style={{ fontWeight: 400, color: "#64748b", fontSize: 11 }}> /night</span>
          </span>
          <a
            href={`/listings/${listing.id}`}
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: "#6366f1",
              textDecoration: "none",
              background: "#eef2ff",
              padding: "4px 10px",
              borderRadius: 20,
            }}
          >
            View →
          </a>
        </div>
      </div>
    </div>
  );
}
