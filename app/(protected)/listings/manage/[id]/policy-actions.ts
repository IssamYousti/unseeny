"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { POLICY_PRESETS, type PolicyType } from "@/lib/cancellation";

// ─── Assert listing ownership ─────────────────────────────────────────────────

async function assertOwner(listingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("host_id", user.id)
    .maybeSingle();
  if (!data) throw new Error("Not authorized");
  return supabase;
}

// ─── Save cancellation policy ─────────────────────────────────────────────────

export async function saveCancellationPolicy(
  listingId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await assertOwner(listingId);

  const policyType = (formData.get("policy_type") as PolicyType) ?? "moderate";

  let full_refund_days_before: number;
  let partial_refund_days_before: number;
  let partial_refund_percentage: number;
  let cutoff_hour: number;

  if (policyType !== "custom") {
    const preset = POLICY_PRESETS[policyType as Exclude<PolicyType, "custom">];
    full_refund_days_before = preset.full_refund_days_before;
    partial_refund_days_before = preset.partial_refund_days_before;
    partial_refund_percentage = preset.partial_refund_percentage;
    cutoff_hour = preset.cutoff_hour;
  } else {
    full_refund_days_before = Number(formData.get("full_refund_days_before")) || 5;
    partial_refund_days_before = Number(formData.get("partial_refund_days_before")) || 1;
    partial_refund_percentage = Number(formData.get("partial_refund_percentage")) || 50;
    cutoff_hour = Number(formData.get("cutoff_hour")) || 18;
  }

  const timezone = (formData.get("timezone") as string) || "UTC";

  const { error } = await supabase.from("listing_cancellation_policy").upsert(
    {
      listing_id: listingId,
      policy_type: policyType,
      full_refund_days_before,
      partial_refund_days_before,
      partial_refund_percentage,
      cutoff_hour,
      timezone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "listing_id" },
  );

  if (error) return { error: error.message };
  revalidatePath(`/listings/manage/${listingId}`);
  revalidatePath(`/listings/${listingId}`);
  return {};
}

// ─── Save property rules ──────────────────────────────────────────────────────

export async function saveListingRules(
  listingId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await assertOwner(listingId);

  const bool = (key: string) => formData.get(key) === "on";
  const str = (key: string, fallback = "") =>
    ((formData.get(key) as string) ?? fallback).trim() || fallback;

  const { error } = await supabase.from("listing_rules").upsert(
    {
      listing_id: listingId,
      check_in_from: str("check_in_from", "15:00"),
      check_in_until: str("check_in_until", "22:00"),
      checkout_before: str("checkout_before", "11:00"),
      self_checkin_method: str("self_checkin_method", "host"),
      pets_allowed: bool("pets_allowed"),
      smoking_allowed: bool("smoking_allowed"),
      parties_allowed: bool("parties_allowed"),
      quiet_hours_start: str("quiet_hours_start", "22:00") || null,
      quiet_hours_end: str("quiet_hours_end", "09:00") || null,
      commercial_photography: bool("commercial_photography"),
      additional_rules: str("additional_rules") || null,
      return_keys: bool("return_keys"),
      lock_up: bool("lock_up"),
      turn_things_off: bool("turn_things_off"),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "listing_id" },
  );

  if (error) return { error: error.message };
  revalidatePath(`/listings/manage/${listingId}`);
  revalidatePath(`/listings/${listingId}`);
  return {};
}
