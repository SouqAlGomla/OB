import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Filter } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { SiteShell } from "@/components/SiteShell";
import { AdCard } from "@/components/AdCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
});

export const Route = createFileRoute("/ads/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "كل الإعلانات — إعلانات العبور" },
      { name: "description", content: "تصفح كل الإعلانات المبوبة في مدينة العبور" },
    ],
  }),
  component: AdsListPage,
});

function AdsListPage() {
  const search = useSearch({ from: "/ads" });
  const [ads, setAds] = useState<Tables<"ads">[]>([]);
  const [categories, setCategories] = useState<Tables<"categories">[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(search.q ?? "");
  const [categoryFilter, setCategoryFilter] = useState(search.category ?? "all");
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc">("newest");

  useEffect(() => {
    supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  useEffect(() => {
    void loadAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.q, search.category, categoryFilter, sort]);

  const loadAds = async () => {
    setLoading(true);
    let q = supabase.from("ads").select("*").eq("status", "approved");

    if (search.q) q = q.ilike("title", `%${search.q}%`);
    const cat = search.category ?? (categoryFilter !== "all" ? categoryFilter : undefined);
    if (cat) {
      const c = categories.find((x) => x.slug === cat);
      if (c) q = q.eq("category_id", c.id);
    }

    if (sort === "newest") q = q.order("created_at", { ascending: false });
    else if (sort === "price_asc") q = q.order("price", { ascending: true, nullsFirst: false });
    else q = q.order("price", { ascending: false, nullsFirst: false });

    // Featured first
    q = q.order("is_featured", { ascending: false });

    const { data } = await q.limit(60);
    setAds(data ?? []);
    setLoading(false);
  };

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold sm:text-3xl">كل الإعلانات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "جاري التحميل..." : `${ads.length} إعلان`}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  window.history.replaceState({}, "", `/ads?q=${encodeURIComponent(query)}`);
                  void loadAds();
                }
              }}
              placeholder="ابحث في العنوان..."
              className="pr-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="sm:w-48">
              <Filter className="ml-1 h-4 w-4" />
              <SelectValue placeholder="القسم" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأقسام</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">الأحدث</SelectItem>
              <SelectItem value="price_asc">السعر: من الأقل</SelectItem>
              <SelectItem value="price_desc">السعر: من الأعلى</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : ads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">مفيش إعلانات تطابق بحثك</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/ads">مسح الفلاتر</Link>
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
