import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requestBooking } from "./actions";

async function ListingDetail(props: { params: Promise<{ id: string }> }) {
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

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        {/* TITLE */}
        <section>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            {data.title}
          </h1>

          <p className="text-muted-foreground mt-2">
            {data.city}, {data.country}
          </p>
        </section>

        {/* IMAGE PLACEHOLDER */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="aspect-[4/3] rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
            Main photo
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="aspect-square rounded-2xl bg-muted" />
            <div className="aspect-square rounded-2xl bg-muted" />
            <div className="aspect-square rounded-2xl bg-muted" />
            <div className="aspect-square rounded-2xl bg-muted" />
          </div>
        </section>

        {/* CONTENT */}
        <section className="grid lg:grid-cols-[1fr_350px] gap-12">

          {/* LEFT COLUMN */}
          <div className="space-y-8">

            {/* DESCRIPTION */}
            <div>
              <h2 className="text-xl font-semibold mb-3">About this villa</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {data.descr || "No description yet."}
              </p>
            </div>

            {/* DETAILS */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Details</h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-muted-foreground text-sm">Guests</p>
                  <p className="font-medium">{data.max_guests}</p>
                </div>

                <div>
                  <p className="text-muted-foreground text-sm">Bedrooms</p>
                  <p className="font-medium">{data.bedrooms}</p>
                </div>

                <div>
                  <p className="text-muted-foreground text-sm">Bathrooms</p>
                  <p className="font-medium">{data.bathrooms}</p>
                </div>
              </div>
            </div>

            {/* LOCATION */}
            <div>
              <h2 className="text-xl font-semibold mb-3">Location</h2>

              <p className="text-muted-foreground">
                {data.street} {data.house_number} {data.house_number_addition || ""} <br />
                {data.zip_code} {data.city} <br />
                {data.country}
              </p>
            </div>

          </div>

          {/* RIGHT COLUMN — BOOKING CARD */}
          <aside className="h-fit sticky top-24">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">

              <div className="text-2xl font-semibold">
                €{data.price_per_night}
                <span className="text-muted-foreground text-base font-normal">
                  {" "} / night
                </span>
              </div>

              <div className="space-y-3">
              <form action={requestBooking.bind(null, data.id)}>
                <button className="w-full bg-accent text-accent-foreground py-3 rounded-xl font-medium hover:opacity-90 transition">
                  Request booking
                </button>
              </form>


                <p className="text-xs text-muted-foreground text-center">
                  You won’t be charged yet
                </p>
              </div>

            </div>
          </aside>

        </section>
      </div>
    </main>
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-10">Loading villa...</div>}>
      <ListingDetail params={props.params} />
    </Suspense>
  );
}
