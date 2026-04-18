import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Sparkles, TrendingUp, Shield, MessageCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { SiteShell } from "@/components/SiteShell";
import { CategoryCard } from "@/components/CategoryCard";
import { AdCard } from "@/components/AdCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<Tables<"categories">[]>([]);
  const [featured, setFeatured] = useState<Tables<"ads">[]>([]);
  const [recent, setRecent] = useState<Tables<"ads">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    const [cats, feat, rec] = await Promise.all([
      supabase.from("categories").select("*").eq("is_active", true).order("display_order"),
      supabase
        .from("ads")
        .select("*")
        .eq("status", "approved")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("ads")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    setCategories(cats.data ?? []);
    setFeatured(feat.data ?? []);
    setRecent(rec.data ?? []);
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate({ to: "/ads", search: { q: search.trim() } });
    }
  };

  return (
    <SiteShell>
      {/* HERO */}
      <section className="relative overflow-hidden gradient-hero text-primary-foreground">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/40 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-white/30 blur-3xl" />
        </div>

        <div className="container relative mx-auto px-4 py-16 text-center sm:py-24">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            أول وأكبر منصة إعلانات في مدينة العبور
          </div>
          <h1 className="text-balance text-3xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
            بيع، اشتري، أعلن
            <br />
            <span className="bg-gradient-to-l from-amber-200 to-amber-400 bg-clip-text text-transparent">
              في مدينة العبور
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-sm text-white/80 sm:text-lg">
            آلاف الإعلانات المبوبة في كل الأقسام. تواصل مباشرة مع البائع عبر واتساب.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="mx-auto mt-8 flex max-w-xl gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن سيارة، شقة، موبايل..."
                className="h-12 border-0 bg-white pr-10 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 bg-foreground text-background hover:bg-foreground/90">
              بحث
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs">
            <Button asChild size="sm" variant="secondary" className="gap-1">
              <Link to="/ads/new">
                <Sparkles className="h-3.5 w-3.5" />
                أضف إعلانك مجاناً
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
              <Link to="/ads">تصفح الكل</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container mx-auto px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">تصفح حسب القسم</h2>
            <p className="mt-1 text-sm text-muted-foreground">اختر القسم اللي بيناسبك</p>
          </div>
          <Link to="/categories" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex">
            عرض الكل <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        )}
      </section>

      {/* FEATURED ADS */}
      {(loading || featured.length > 0) && (
        <section className="bg-gradient-to-b from-accent/30 to-transparent py-12">
          <div className="container mx-auto px-4">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
                  <Sparkles className="h-6 w-6 text-amber-500" />
                  الإعلانات المميزة
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">إعلانات مختارة بعناية</p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {featured.map((ad) => (
                  <AdCard key={ad.id} ad={ad} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* RECENT ADS */}
      <section className="container mx-auto px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
              <TrendingUp className="h-6 w-6 text-primary" />
              أحدث الإعلانات
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">آخر ما تم نشره</p>
          </div>
          <Link to="/ads" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex">
            عرض الكل <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">مفيش إعلانات لسه. كن أول من ينشر!</p>
            <Button asChild className="mt-4 gradient-primary text-primary-foreground">
              <Link to="/ads/new">أضف أول إعلان</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recent.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        )}
      </section>

      {/* WHY US */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Shield,
              title: "آمن وموثوق",
              desc: "كل الإعلانات تخضع للمراجعة قبل النشر",
            },
            {
              icon: MessageCircle,
              title: "تواصل مباشر",
              desc: "كلم البائع مباشرة عبر واتساب بدون وسطاء",
            },
            {
              icon: Sparkles,
              title: "مجاناً تماماً",
              desc: "أنشر إعلانك بدون أي رسوم خفية",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/60 bg-card p-6 text-center shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
