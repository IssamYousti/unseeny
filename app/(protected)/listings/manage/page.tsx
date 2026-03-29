import { createOrUpdateListing } from "../actions";

export default async function CreateListingPage() {
  return (
    <main className="bg-background min-h-screen">

      <div className="max-w-3xl mx-auto px-6 py-12">

        <h1 className="text-3xl font-semibold tracking-tight mb-8">
          List your villa
        </h1>

        <form action={createOrUpdateListing} className="space-y-10">

          {/* BASIC INFO */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Basic information</h2>

            <div className="space-y-3">
              <input
                name="title"
                placeholder="Villa title"
                required
                className="w-full rounded-xl border border-input bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
              />

              <textarea
                name="descr"
                placeholder="Describe your villa and privacy features"
                rows={5}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </section>

          {/* ADDRESS */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Location</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <input name="street" placeholder="Street" required className="input" />
              <input name="house_number" placeholder="House number" required className="input" />
              <input name="house_number_addition" placeholder="Addition (optional)" className="input" />
              <input name="zip_code" placeholder="ZIP code" required className="input" />
              <input name="city" placeholder="City" required className="input" />
              <input name="country" placeholder="Country" required className="input" />
            </div>
          </section>

          {/* DETAILS */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Property details</h2>

            <div className="grid gap-3 sm:grid-cols-3">
              <input name="max_guests" type="number" placeholder="Guests" required className="input" />
              <input name="bedrooms" type="number" placeholder="Bedrooms" required className="input" />
              <input name="bathrooms" type="number" placeholder="Bathrooms" required className="input" />
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
                placeholder="Price per night"
                required
                className="w-full rounded-xl border border-input bg-background pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </section>

          {/* SUBMIT */}
          <div className="pt-6 border-t border-border">
            <button
              type="submit"
              className="bg-accent text-accent-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90 transition"
            >
              Create listing
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}
