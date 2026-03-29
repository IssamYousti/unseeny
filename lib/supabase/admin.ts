import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS.
 * Only use server-side (never expose the service role key to the browser).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
