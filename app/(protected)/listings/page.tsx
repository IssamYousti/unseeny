import { Suspense } from "react";
import ListingCard from "@/components/ListingCard";
import { getApprovedListings } from "@/lib/data/listings";

async function ListingsLoader() {
  const listings = await getApprovedListings();

  return (
    <main className="min-h-screen bg-background">

      {/* HERO */}
      <section className="border-b border-border bg-secondary/40">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight max-w-2xl">
            Fully private villas for peaceful stays
          </h1>

          <p className="text-muted-foreground mt-4 max-w-xl text-lg">
            HiddenVillas lists homes designed for privacy, comfort and modesty.
            Relax without compromise — every stay respects your personal space.
          </p>
        </div>
      </section>

      {/* LISTINGS GRID */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        {listings.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold">No villas available yet</h3>
            <p className="text-muted-foreground mt-2">
              New private homes are being added soon.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>

    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10">Loading villas...</div>}>
      <ListingsLoader />
    </Suspense>
  );
}
