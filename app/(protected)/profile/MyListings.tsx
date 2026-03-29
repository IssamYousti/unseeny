import Link from "next/link";

type Listing = {
  id: string;
  title: string;
  city: string;
  country: string;
  price_per_night: number;
  is_approved: boolean;
};

export default function MyListings({ listings }: { listings: Listing[] }) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">My listings</h2>
          <p className="text-muted-foreground text-sm">
            Manage the homes you host on HiddenVillas.
          </p>
        </div>

        <Link
          href="/listings/manage"
          className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition"
        >
          Create listing
        </Link>
      </div>

      {listings.length === 0 && (
        <p className="text-muted-foreground">You haven't created any listings yet.</p>
      )}

      <div className="space-y-4">
        {listings.map((l) => (
          <div
            key={l.id}
            className="bg-card border border-border rounded-xl p-5 flex items-center justify-between"
          >
            <div>
              <h3 className="font-semibold">{l.title}</h3>
              <p className="text-sm text-muted-foreground">
                {l.city}, {l.country}
              </p>
              <p className="text-sm mt-1">
                €{l.price_per_night} / night •{" "}
                {l.is_approved ? (
                  <span className="text-green-600 font-medium">Approved</span>
                ) : (
                  <span className="text-orange-500 font-medium">Pending approval</span>
                )}
              </p>
            </div>

            <Link
              href={`/listings/manage/${l.id}`}
              className="text-primary font-medium hover:underline"
            >
              Edit
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
