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

export default function ListingsMap({ listings }: { listings: MapListing[] }) {
  return (
    <div className="w-full h-full relative">
      <ListingsMapInner listings={listings} />
    </div>
  );
}
