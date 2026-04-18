import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { SiteShell } from "@/components/SiteShell";
import { AdCard } from "@/components/AdCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getIcon } from "@/lib/format";

export const Route = createFileRoute("/categories/$slug")({
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = useParams({ from: "/categories/$slug" });
  const [category, setCategory] = useState<Tables<"categories"> | null>(null);
  const [ads, setAds] = useState<Tables<"ads">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const load = async () => {
    setLoading(true);
    const { data: cat } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    setCategory(cat);
    if (cat) {
      const { data } = await supabase
        .from("ads")
        .select("*")
        .eq("category_id", cat.id)
        .eq("status", "approved")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(60);
      setAds(data ?? []);
    }
    setLoading(false);
  };

  if (!loading && !category) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">القسم غير موجود</h1>
          <Button asChild className="mt-6 gradient-primary text-primary-foreground">
            <Link to="/categories">عرض كل الأقسام</Link>
          </Button>
        </div>
      </SiteShell>
    );
  }

  const Icon = getIcon(category?.icon);

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-8">
        {category && (
          <div className="mb-8 flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-6 shadow-card">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary text-primary-foreground shadow-elegant">
              <Icon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">{category.name}</h1>
              <p className="text-sm text-muted-foreground">{ads.length} إعلان</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : ads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">مفيش إعلانات في هذا القسم بعد</p>
            <Button asChild className="mt-4 gradient-primary text-primary-foreground">
              <Link to="/ads/new">كن أول من ينشر</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
