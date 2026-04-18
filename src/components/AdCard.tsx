import { Link } from "@tanstack/react-router";
import { Eye, MapPin, Sparkles } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type Ad = Pick<
  Tables<"ads">,
  | "id"
  | "title"
  | "price"
  | "currency"
  | "location"
  | "images"
  | "is_featured"
  | "views_count"
  | "created_at"
>;

export function AdCard({ ad }: { ad: Ad }) {
  const cover = ad.images?.[0];

  return (
    <Link to="/ads/$adId" params={{ adId: ad.id }}>
      <Card className="group h-full overflow-hidden border-border/60 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {cover ? (
            <img
              src={cover}
              alt={ad.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-accent/40 text-4xl">
              📦
            </div>
          )}
          {ad.is_featured && (
            <Badge className="absolute right-2 top-2 gap-1 bg-gradient-to-l from-amber-500 to-orange-500 text-white shadow-md">
              <Sparkles className="h-3 w-3" />
              مميز
            </Badge>
          )}
        </div>

        <div className="p-3">
          <h3 className="line-clamp-2 text-sm font-bold leading-tight text-foreground group-hover:text-primary">
            {ad.title}
          </h3>
          <div className="mt-2 text-base font-bold text-primary">
            {formatPrice(ad.price, ad.currency)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{ad.location || "العبور"}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <Eye className="h-3 w-3" />
              {ad.views_count}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            {formatRelativeTime(ad.created_at)}
          </div>
        </div>
      </Card>
    </Link>
  );
}
