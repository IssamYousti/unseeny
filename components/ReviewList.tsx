import { createClient } from "@/lib/supabase/server";
import { Star } from "lucide-react";

type Props = {
  listingId: string;
  labels: {
    title: string;
    no_reviews: string;
    anonymous: string;
  };
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${
            n <= rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export default async function ReviewList({ listingId, labels }: Props) {
  const supabase = await createClient();

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, reviewer_id, profiles(first_name, last_name)")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });

  if (!reviews || reviews.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-3">{labels.title}</h2>
        <p className="text-muted-foreground text-sm">{labels.no_reviews}</p>
      </div>
    );
  }

  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-semibold">{labels.title}</h2>
        <div className="flex items-center gap-1.5">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-sm">{avg.toFixed(1)}</span>
          <span className="text-muted-foreground text-sm">({reviews.length})</span>
        </div>
      </div>

      <div className="space-y-6">
        {reviews.map((r) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const profile = r.profiles as any;
          const name = profile
            ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || labels.anonymous
            : labels.anonymous;

          return (
            <div key={r.id} className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{name}</span>
                </div>
                <Stars rating={r.rating} />
              </div>
              {r.comment && (
                <p className="text-sm text-muted-foreground leading-relaxed pl-10">
                  {r.comment}
                </p>
              )}
              <p className="text-xs text-muted-foreground/60 pl-10">
                {new Date(r.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long" })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
