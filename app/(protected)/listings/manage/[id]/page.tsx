import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server"
import { createOrUpdateListing, deleteListing } from "../../actions";

async function EditListing(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  const supabase = await createClient();

  const { data } = await supabase
    .from("listings")
    .select()
    .eq("id", params.id)
    .single();

  if (!data) return <p className="p-10">Listing not found.</p>;

  return (
    <main className="bg-background min-h-screen">

      <div className="max-w-3xl mx-auto px-6 py-12">

        <h1 className="text-3xl font-semibold tracking-tight mb-8">
          Edit your listing
        </h1>

        <form action={createOrUpdateListing} className="space-y-10">

          <input type="hidden" name="listing_id" value={data.id} />

          {/* BASIC INFO */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Basic information</h2>

            <div className="space-y-3">
              <input
                name="title"
                defaultValue={data.title}
                required
                className="input"
              />

              <textarea
                name="descr"
                defaultValue={data.descr || ""}
                rows={5}
                className="input"
              />
            </div>
          </section>

          {/* ADDRESS */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Location</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <input name="street" defaultValue={data.street} required className="input" />
              <input name="house_number" defaultValue={data.house_number} required className="input" />
              <input name="house_number_addition" defaultValue={data.house_number_addition || ""} className="input" />
              <input name="zip_code" defaultValue={data.zip_code} required className="input" />
              <input name="city" defaultValue={data.city} required className="input" />
              <input name="country" defaultValue={data.country} required className="input" />
            </div>
          </section>

          {/* DETAILS */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Property details</h2>

            <div className="grid gap-3 sm:grid-cols-3">
              <input name="max_guests" type="number" defaultValue={data.max_guests} required className="input" />
              <input name="bedrooms" type="number" defaultValue={data.bedrooms} required className="input" />
              <input name="bathrooms" type="number" defaultValue={data.bathrooms} required className="input" />
            </div>
          </section>

          {/* PRICE */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Pricing</h2>

            <div className="relative max-w-xs">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
              <input
                name="price_per_night"
                type="number"
                defaultValue={data.price_per_night}
                required
                className="w-full rounded-xl border border-input bg-background pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </section>

          {/* ACTIONS */}
          <div className="pt-6 border-t border-border flex flex-col sm:flex-row gap-4 justify-between">

            <button
              type="submit"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90 transition"
            >
              Save changes
            </button>

          </div>
        </form>

        {/* DELETE */}
        <form action={deleteListing.bind(null, data.id)} className="mt-10">
          <button className="text-destructive hover:underline text-sm">
            Delete listing
          </button>
        </form>

      </div>
    </main>
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-10">Loading listing...</div>}>
      <EditListing params={props.params} />
    </Suspense>
  );
}
