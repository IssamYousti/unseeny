"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleFavourite } from "@/app/(protected)/favourites/actions";

type Props = {
  listingId: string;
  initialFavourite: boolean;
  size?: "sm" | "md";
};

export default function FavouriteButton({
  listingId,
  initialFavourite,
  size = "sm",
}: Props) {
  const [isFav, setIsFav] = useState(initialFavourite);
  const [isPending, startTransition] = useTransition();

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !isFav;
    setIsFav(next); // Optimistic
    startTransition(async () => {
      try {
        const result = await toggleFavourite(listingId);
        setIsFav(result.isFavourite);
      } catch {
        setIsFav(!next); // Revert on error
      }
    });
  }

  const dim = size === "md" ? "h-9 w-9" : "h-8 w-8";
  const icon = size === "md" ? "h-4.5 w-4.5" : "h-4 w-4";

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      title={isFav ? "Remove from favourites" : "Save to favourites"}
      className={`${dim} flex items-center justify-center rounded-full bg-background/85 backdrop-blur-sm border border-white/20 shadow-sm hover:scale-110 active:scale-95 transition-all duration-150 disabled:opacity-50`}
    >
      <Heart
        className={`${icon} transition-all duration-200 ${
          isFav ? "fill-rose-500 text-rose-500 scale-110" : "text-muted-foreground"
        }`}
      />
    </button>
  );
}
