"use client";

import { useState } from "react";
import { ArrowRight, Euro, TrendingUp, Landmark } from "lucide-react";
import {
  hostEarnsToGuestPrice,
  guestPriceToHostPayout,
  calcPlatformTake,
  type PlatformConfig,
} from "@/lib/platform-config";

type PriceType = "guest_pays" | "host_earns";

type Props = {
  config: PlatformConfig;
  defaultPrice?: number;
  defaultPriceType?: PriceType;
};

function fmt(n: number) {
  return n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PricingInput({ config, defaultPrice, defaultPriceType = "guest_pays" }: Props) {
  const [priceType, setPriceType] = useState<PriceType>(defaultPriceType);
  const [amount, setAmount] = useState<number>(defaultPrice ?? 0);

  const guestPrice =
    priceType === "guest_pays"
      ? amount
      : hostEarnsToGuestPrice(amount, config);

  const hostPayout =
    priceType === "host_earns"
      ? amount
      : guestPriceToHostPayout(amount, config);

  const platformTake = guestPrice - hostPayout;
  const hostFeePct = Math.round(config.host_fee_pct * 100);
  const guestMarkupPct = Math.round(config.guest_markup_pct * 100);

  return (
    <div className="space-y-5">
      {/* Hidden fields consumed by the parent form */}
      <input type="hidden" name="price_per_night" value={amount > 0 ? fmt(guestPrice).replace(/,/g, "") : ""} />
      <input type="hidden" name="host_payout_per_night" value={amount > 0 ? fmt(hostPayout).replace(/,/g, "") : ""} />
      <input type="hidden" name="price_type" value={priceType} />

      {/* Price type toggle */}
      <div className="inline-flex rounded-xl border border-border overflow-hidden text-sm">
        <button
          type="button"
          onClick={() => setPriceType("guest_pays")}
          className={`px-4 py-2 font-medium transition ${
            priceType === "guest_pays"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          Guest pays this
        </button>
        <button
          type="button"
          onClick={() => setPriceType("host_earns")}
          className={`px-4 py-2 font-medium transition ${
            priceType === "host_earns"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          I earn this
        </button>
      </div>

      {/* Amount input */}
      <div className="relative max-w-xs">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-medium select-none">
          €
        </span>
        <input
          type="number"
          min={1}
          step="0.01"
          value={amount || ""}
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
          placeholder="0.00"
          className="w-full bg-background border border-border rounded-xl pl-8 pr-4 py-2.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
          required
        />
      </div>

      {/* Live simulation */}
      {amount > 0 && (
        <div className="bg-muted/30 border border-border/60 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Pricing breakdown · per night
            </p>
          </div>

          <div className="divide-y divide-border/40">
            {/* Guest pays */}
            <div className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-2.5 text-sm">
                <Euro className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">Guest pays</span>
                {priceType === "host_earns" && (
                  <span className="text-xs text-muted-foreground">
                    (incl. {guestMarkupPct}% service fee)
                  </span>
                )}
              </div>
              <span className={`text-sm font-bold ${priceType === "host_earns" ? "text-foreground" : "text-primary"}`}>
                €{fmt(guestPrice)}
              </span>
            </div>

            {/* Platform take */}
            <div className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-2.5 text-sm">
                <Landmark className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Platform fees</span>
                <span className="text-xs text-muted-foreground/60">
                  ({guestMarkupPct}% + {hostFeePct}%)
                </span>
              </div>
              <span className="text-sm text-muted-foreground">−€{fmt(platformTake)}</span>
            </div>

            {/* Arrow */}
            <div className="flex justify-center py-1 bg-muted/20">
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 rotate-90" />
            </div>

            {/* Host earns */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-primary/[0.03]">
              <div className="flex items-center gap-2.5 text-sm">
                <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold">You earn</span>
                {priceType === "guest_pays" && (
                  <span className="text-xs text-muted-foreground">
                    (after {hostFeePct}% fee)
                  </span>
                )}
              </div>
              <span className={`text-base font-bold ${priceType === "host_earns" ? "text-primary" : "text-foreground"}`}>
                €{fmt(hostPayout)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
