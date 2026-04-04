import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getListingImageUrl } from "@/lib/data/listings";
import { approveListing } from "../../actions";
import RejectListingDialog from "@/components/admin/RejectListingDialog";
import EquipmentDisplay from "@/components/EquipmentDisplay";
import { ArrowLeft, Star, Euro, Users, BedDouble, Bath, MapPin, AlertTriangle } from "lucide-react";

async function AdminListingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: role } = await supabase
    .from("roles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();
  if (!role?.is_admin) redirect("/listings");

  const adminClient = createAdminClient();

  const [
    { data: listing },
    { data: imageRows },
    { data: reviews },
    { data: hostProfile },
    { data: equipmentItems },
  ] = await Promise.all([
    adminClient.from("listings").select("*").eq("id", id).single(),
    adminClient
      .from("listing_images")
      .select("storage_path, position")
      .eq("listing_id", id)
      .order("position", { ascending: true }),
    adminClient.from("reviews").select("rating").eq("listing_id", id),
    supabase.from("profiles").select("first_name, last_name").eq("id", "").maybeSingle(), // placeholder
    adminClient.from("equipment_items").select("*").eq("is_active", true).order("category").order("sort_order"),
  ]);

  if (!listing) {
    return (
      <main className="p-10">
        <p className="text-muted-foreground">Listing not found.</p>
        <Link href="/admin?tab=listings" className="text-primary hover:underline text-sm mt-2 inline-block">← Back to listings</Link>
      </main>
    );
  }

  // Fetch host profile
  const { data: host } = await adminClient
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", listing.host_id)
    .maybeSingle();

  const hostName = host
    ? [host.first_name, host.last_name].filter(Boolean).join(" ") || "Unknown"
    : listing.host_id.slice(0, 8) + "…";

  const images = (imageRows ?? []).map((r) => getListingImageUrl(r.storage_path));

  const reviewCount = reviews?.length ?? 0;
  const avgRating = reviewCount > 0
    ? (reviews!.reduce((s, r) => s + r.rating, 0) / reviewCount).toFixed(1)
    : null;

  const isHtml = listing.descr?.startsWith("<");

  return (
    <main className="bg-background min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Back + Status header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <Link
              href="/admin?tab=listings"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition mb-3"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to listings
            </Link>
            <h1 className="text-2xl font-semibold">{listing.title}</h1>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {listing.city}, {listing.country}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {listing.is_approved ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Approved
              </span>
            ) : listing.is_rejected ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                Rejected
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Pending review
              </span>
            )}

            {!listing.is_approved && (
              <form action={approveListing.bind(null, listing.id)}>
                <button className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition">
                  Approve
                </button>
              </form>
            )}
            <RejectListingDialog listingId={listing.id} listingTitle={listing.title} />
          </div>
        </div>

        {/* Rejection reason (if rejected) */}
        {listing.is_rejected && listing.rejection_reason && (
          <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-2xl px-5 py-4">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Rejection reason</p>
              <p className="text-sm text-muted-foreground mt-1">{listing.rejection_reason}</p>
            </div>
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap gap-6 text-sm bg-card border border-border rounded-2xl px-6 py-4">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Host</p>
            <p className="font-medium mt-0.5">{hostName}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Price / night</p>
            <p className="font-medium mt-0.5 flex items-center gap-1"><Euro className="h-3.5 w-3.5" />{listing.price_per_night}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Guests</p>
            <p className="font-medium mt-0.5 flex items-center gap-1"><Users className="h-3.5 w-3.5" />{listing.max_guests}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Bedrooms</p>
            <p className="font-medium mt-0.5 flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{listing.bedrooms}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Bathrooms</p>
            <p className="font-medium mt-0.5 flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{listing.bathrooms}</p>
          </div>
          {avgRating && (
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Rating</p>
              <p className="font-medium mt-0.5 flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {avgRating} ({reviewCount})
              </p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Submitted</p>
            <p className="font-medium mt-0.5">
              {new Date(listing.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Images */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Photos ({images.length})</h2>
          {images.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No photos uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {images.map((url, i) => (
                <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  {i === 0 && (
                    <span className="absolute top-2 left-2 bg-background/85 backdrop-blur-sm text-xs font-medium px-2 py-0.5 rounded-full">
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Description */}
        {listing.descr && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Description</h2>
            {isHtml ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: listing.descr }}
              />
            ) : (
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{listing.descr}</p>
            )}
          </section>
        )}

        {/* Address (full — admin can see it) */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Full address</h2>
          <p className="text-sm text-muted-foreground">
            {listing.street} {listing.house_number}{listing.house_number_addition ? ` ${listing.house_number_addition}` : ""},{" "}
            {listing.zip_code} {listing.city}, {listing.country}
          </p>
          {listing.latitude && (
            <p className="text-xs text-muted-foreground/60 mt-1">
              {listing.latitude.toFixed(5)}, {listing.longitude?.toFixed(5)}
            </p>
          )}
        </section>

        {/* Equipment */}
        {listing.amenities && listing.amenities.length > 0 && equipmentItems && equipmentItems.length > 0 && (
          <section>
            <EquipmentDisplay
              selected={listing.amenities}
              allItems={equipmentItems}
              sectionTitle="Equipment"
            />
          </section>
        )}

      </div>
    </main>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-10 text-muted-foreground">Loading…</div>}>
      <AdminListingDetail params={params} />
    </Suspense>
  );
}
