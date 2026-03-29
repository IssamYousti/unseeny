import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./ProfileForm";
import MyListings from "./MyListings";
import Link from "next/link";

async function ProfileLoader() {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;

  if (!user) return null;

  // profile
  const { data: profile } = await supabase
    .from("profiles")
    .select()
    .eq("id", user.id)
    .single();

  // role
  const { data: role } = await supabase
    .from("roles")
    .select("is_approved_owner")
    .eq("user_id", user.id)
    .single();

  // listings (only theirs)
  const { data: listings } = await supabase
    .from("listings")
    .select()
    .eq("host_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-12">

      {/* PROFILE */}
      <section className="space-y-6">
  <div className="flex items-start justify-between gap-4 flex-wrap">

    <div>
      <h1 className="text-3xl font-semibold tracking-tight">
        Your profile
      </h1>

      <p className="text-muted-foreground mt-2">
        Manage your personal information.
      </p>
    </div>

    {!role?.is_approved_owner && (
      <Link
        href="/become-host"
        className="
          inline-flex items-center justify-center
          rounded-xl px-5 py-3
          bg-accent text-accent-foreground
          font-medium text-sm
          shadow-sm
          hover:opacity-90 transition
          whitespace-nowrap
        "
      >
        Become a host
      </Link>
    )}

  </div>

  <div className="bg-card border border-border rounded-2xl p-8">
    <ProfileForm profile={profile || {}} />
  </div>
</section>


      {/* HOST SECTION */}
      {role?.is_approved_owner && (
        <MyListings listings={listings || []} />
      )}

    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10">Loading profile...</div>}>
      <ProfileLoader />
    </Suspense>
  );
}
