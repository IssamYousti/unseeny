import Link from "next/link";
import { Lock, Star } from "lucide-react";
// Lock icon kept for the placeholder state only
import { getTranslations } from "next-intl/server";
import FavouriteButton from "@/components/FavouriteButton";

type Props = {
  listing: {
    id: string;
    title: string;
    city: string;
    country: string;
    price_per_night: number;
    cover_image_url?: string | null;
    avg_rating?: number | null;
    review_count?: number;
  };
  /** Pass `true`/`false` only when user is logged in — omit for guests */
  isFavourite?: boolean;
};

export default async function ListingCard({ listing, isFavourite }: Props) {
  const t = await getTranslations("listingCard");

  return (
    <article className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">

      {/* Image */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-primary/20 via-secondary to-accent/10 overflow-hidden">
        {listing.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.cover_image_url}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="h-10 w-10 rounded-full bg-background/60 border border-border flex items-center justify-center">
              <Lock className="h-5 w-5 text-primary/70" />
            </div>
            <span className="text-xs text-muted-foreground/70">{t("photos_soon")}</span>
          </div>
        )}

        {/* Favourite button — only shown to logged-in users */}
        {isFavourite !== undefined && (
          <div className="absolute top-3 right-3">
            <FavouriteButton listingId={listing.id} initialFavourite={isFavourite} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-1.5">
        <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors">
          {listing.title}
        </h3>

        <p className="text-sm text-muted-foreground">
          {listing.city}, {listing.country}
        </p>

        {listing.avg_rating != null && (
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium">{listing.avg_rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({listing.review_count})</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-3">
          <span className="font-semibold text-sm">
            €{listing.price_per_night}
            <span className="text-muted-foreground font-normal"> {t("per_night")}</span>
          </span>

          <Link
            href={`/listings/${listing.id}`}
            className="text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
          >
            {t("view")}
          </Link>
        </div>
      </div>
    </article>
  );
}
