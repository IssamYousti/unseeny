import Link from "next/link";

type Props = {
  listing: {
    id: string;
    title: string;
    city: string;
    country: string;
    price_per_night: number;
  };
};

export default function ListingCard({ listing }: Props) {
  return (
    <article className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition">

      {/* Image placeholder (future: Supabase storage images) */}
      <div className="aspect-[4/3] bg-muted flex items-center justify-center text-muted-foreground text-sm">
        Villa photo coming soon
      </div>

      {/* Content */}
      <div className="p-5 space-y-2">
        <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition">
          {listing.title}
        </h3>

        <p className="text-sm text-muted-foreground">
          {listing.city}, {listing.country}
        </p>

        <div className="flex items-center justify-between pt-3">
          <span className="font-semibold">
            €{listing.price_per_night}
            <span className="text-muted-foreground font-normal"> / night</span>
          </span>

          <Link
            href={`/listings/${listing.id}`}
            className="text-primary font-medium hover:underline"
          >
            View →
          </Link>
        </div>
      </div>
    </article>
  );
}
