"use client";

import { useState } from "react";
import { Euro, TrendingUp, Landmark, Receipt } from "lucide-react";
import {
  hostEarnsToGuestPrice,
  guestPriceToHostPayout,
  type PlatformConfig,
} from "@/lib/platform-config";
import { calcVatBreakdown, hostNetToGuestPrice } from "@/lib/vat";

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

  // Derive the guest price (excl. VAT) — the value stored as price_per_night
  const guestPriceExclVat =
    priceType === "guest_pays"
      ? amount
      : hostNetToGuestPrice(amount, config.guest_markup_pct, config.host_fee_pct, config.vat_pct);

  const hostPayoutLegacy =
    priceType === "host_earns"
      ? amount
      : guestPriceToHostPayout(amount, config);

  const vatPct = Math.round(config.vat_pct * 100);

  // Full VAT breakdown (B2C assumption for display — actual treatment calculated at booking)
  const vat = amount > 0
    ? calcVatBreakdown(guestPriceExclVat, config.guest_markup_pct, config.host_fee_pct, config.vat_pct)
    : null;

  return (
    <div className="space-y-5">
      {/* Hidden fields consumed by the parent form */}
      <input type="hidden" name="price_per_night"       value={guestPriceExclVat > 0 ? fmt(guestPriceExclVat).replace(/,/g, "") : ""} />
      <input type="hidden" name="host_payout_per_night" value={hostPayoutLegacy > 0  ? fmt(hostPayoutLegacy).replace(/,/g, "")  : ""} />
      <input type="hidden" name="price_type"            value={priceType} />

      {/* Mode toggle */}
      <div className="inline-flex rounded-xl border border-border overflow-hidden text-sm">
        <button
          type="button"
          onClick={() => setPriceType("guest_pays")}
          className={`px-4 py-2 font-medium transition ${priceType === "guest_pays" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
        >
          Guest pays this
        </button>
        <button
          type="button"
          onClick={() => setPriceType("host_earns")}
          className={`px-4 py-2 font-medium transition ${priceType === "host_earns" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
        >
          I earn this
        </button>
      </div>

      {/* Amount input */}
      <div className="relative max-w-xs">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-medium select-none">€</span>
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
        {priceType === "host_earns" && (
          <p className="mt-1.5 text-xs text-muted-foreground/60">
            Net amount you receive after commission &amp; VAT on commission.
          </p>
        )}
      </div>

      {/* Full breakdown */}
      {vat && (
        <div className="bg-muted/30 border border-border/60 rounded-2xl overflow-hidden text-sm">

          {/* ── Guest side ─────────────────────────────────────── */}
          <div className="px-5 py-2.5 border-b border-border/60 bg-muted/20">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              What the guest pays
            </p>
          </div>

          <Row
            icon={<Euro className="h-4 w-4 text-muted-foreground" />}
            label="Accommodation"
            sub="host's supply — no platform VAT"
            value={`€${fmt(vat.accommodationBase)}`}
          />
          <Row
            icon={<Landmark className="h-4 w-4 text-muted-foreground" />}
            label={`Service fee (${Math.round(config.guest_markup_pct * 100)}%)`}
            sub="excl. VAT"
            value={`€${fmt(vat.guestFeeExclVat)}`}
          />
          <Row
            icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
            label={`VAT ${vatPct}% on service fee`}
            sub="platform collects & remits"
            value={`€${fmt(vat.guestFeeVatAmount)}`}
            highlight
          />

          <div className="flex items-center justify-between px-5 py-3.5 bg-primary/[0.04] border-t border-border/60">
            <span className="font-semibold">Guest total (Stripe charge)</span>
            <span className="font-bold text-primary">€{fmt(vat.guestTotal)}</span>
          </div>

          {/* ── Host side ──────────────────────────────────────── */}
          <div className="px-5 py-2.5 border-t border-border/60 bg-muted/20">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Your payout
            </p>
          </div>

          <Row
            icon={<Euro className="h-4 w-4 text-muted-foreground" />}
            label="Accommodation revenue"
            value={`€${fmt(vat.accommodationBase)}`}
          />
          <Row
            icon={<Landmark className="h-4 w-4 text-muted-foreground" />}
            label={`Platform commission (${Math.round(config.host_fee_pct * 100)}%)`}
            value={`−€${fmt(vat.hostCommissionExcl)}`}
            muted
          />
          <Row
            icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
            label={`VAT ${vatPct}% on commission`}
            sub="deducted from payout"
            value={`−€${fmt(vat.hostCommissionVatAmount)}`}
            muted
          />

          <div className="flex items-center justify-between px-5 py-3.5 bg-primary/[0.04] border-t border-border/60">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-semibold">You receive</span>
            </div>
            <span className="font-bold text-base">€{fmt(vat.hostPayout)}</span>
          </div>

          {/* ── Platform summary ───────────────────────────────── */}
          <div className="px-5 py-3 border-t border-border/60 bg-muted/10 flex items-center justify-between">
            <span className="text-xs text-muted-foreground/60">
              Platform net (after remitting €{fmt(vat.platformVatLiability)} VAT)
            </span>
            <span className="text-xs text-muted-foreground/60">
              €{fmt(vat.platformNet)}
            </span>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground/50">
        VAT ({vatPct}%) applies to Unseeny's service fees only, not the accommodation.
        Shown for B2C guests. Reverse charge applies for VAT-registered guests/hosts.
      </p>
    </div>
  );
}

function Row({
  icon, label, sub, value, muted, highlight,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  value: string;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-5 py-3 border-b border-border/30 ${highlight ? "bg-amber-500/[0.03]" : ""}`}>
      <div className="flex items-center gap-2.5">
        {icon}
        <div>
          <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
          {sub && <p className="text-[11px] text-muted-foreground/50 leading-none mt-0.5">{sub}</p>}
        </div>
      </div>
      <span className={`font-medium tabular-nums ${muted ? "text-muted-foreground" : highlight ? "text-amber-600 dark:text-amber-400" : ""}`}>
        {value}
      </span>
    </div>
  );
}
