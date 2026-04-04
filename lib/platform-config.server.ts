/**
 * Server-only — imports from @/lib/supabase/server.
 * Do NOT import this file in client components.
 * Client components should only import from @/lib/platform-config.ts.
 */
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CONFIG, type PlatformConfig } from "./platform-config";

export async function getPlatformConfig(): Promise<PlatformConfig> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_config")
    .select("host_fee_pct, guest_markup_pct")
    .eq("id", "default")
    .maybeSingle();
  if (!data) return DEFAULT_CONFIG;
  return {
    host_fee_pct: Number(data.host_fee_pct),
    guest_markup_pct: Number(data.guest_markup_pct),
  };
}
