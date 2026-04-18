import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { SiteShell } from "@/components/SiteShell";
import { CategoryCard } from "@/components/CategoryCard";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/categories/")({
  head: () => ({
    meta: [
      { title: "كل الأقسام — إعلانات العبور" },
      { name: "description", content: "تصفح كل أقسام الإعلانات في موقع إعلانات مدينة العبور" },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const [categories, setCategories] = useState<Tables<"categories">[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    setCategories(cats ?? []);

    if (cats) {
      const countsMap: Record<string, number> = {};
      await Promise.all(
        cats.map(async (c) => {
          const { count } = await supabase
            .from("ads")
            .select("id", { count: "exact", head: true })
            .eq("category_id", c.id)
            .eq("status", "approved");
          countsMap[c.id] = count ?? 0;
        }),
      );
      setCounts(countsMap);
    }
    setLoading(false);
  };

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">الأقسام</h1>
          <p className="mt-2 text-muted-foreground">اختر القسم اللي بيناسبك</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => (
              <CategoryCard key={c.id} category={c} count={counts[c.id]} />
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
