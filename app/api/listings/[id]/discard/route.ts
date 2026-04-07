import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Called via navigator.sendBeacon when a host navigates away from an unsaved
 * draft listing. Only deletes if the listing still has price_per_night = 0,
 * which is the marker for "never properly saved". Safe to call at any time.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  await supabase
    .from("listings")
    .delete()
    .eq("id", id)
    .eq("host_id", user.id)
    .eq("price_per_night", 0); // only delete drafts that were never saved

  return new NextResponse("ok");
}
