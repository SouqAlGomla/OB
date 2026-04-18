import { Link } from "@tanstack/react-router";
import type { Tables } from "@/integrations/supabase/types";
import { getIcon } from "@/lib/format";
import { Card } from "@/components/ui/card";

type Category = Pick<Tables<"categories">, "id" | "name" | "slug" | "icon">;

export function CategoryCard({ category, count }: { category: Category; count?: number }) {
  const Icon = getIcon(category.icon);

  return (
    <Link to="/categories/$slug" params={{ slug: category.slug }}>
      <Card className="group flex h-full flex-col items-center justify-center gap-2 border-border/60 p-4 text-center transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground sm:h-14 sm:w-14">
          <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>
        <h3 className="text-xs font-bold text-foreground group-hover:text-primary sm:text-sm">
          {category.name}
        </h3>
        {count !== undefined && (
          <span className="text-[10px] text-muted-foreground">{count} إعلان</span>
        )}
      </Card>
    </Link>
  );
}
