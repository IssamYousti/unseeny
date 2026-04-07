"use client";

import dynamic from "next/dynamic";
import type { MapListing } from "./ListingsMapInner";

const ListingsMapInner = dynamic(() => import("./ListingsMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted/40 animate-pulse" />
  ),
});

export type { MapListing };

export default function ListingsMap({
  listings,
  center,
  zoom,
}: {
  listings: MapListing[];
  center?: [number, number];
  zoom?: number;
}) {
  return (
    <div className="w-full h-full relative">
      <ListingsMapInner listings={listings} center={center} zoom={zoom} />
    </div>
  );
}
