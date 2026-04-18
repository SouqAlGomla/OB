import { createFileRoute, Link, notFound, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, MapPin, MessageCircle, Sparkles, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { SiteShell } from "@/components/SiteShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, formatRelativeTime, buildWhatsAppLink } from "@/lib/format";

type Ad = Tables<"ads"> & {
  categories: Pick<Tables<"categories">, "id" | "name" | "slug"> | null;
  profiles: Pick<Tables<"profiles">, "id" | "display_name" | "avatar_url"> | null;
};

export const Route = createFileRoute("/ads/$adId")({
  component: AdDetailPage,
});

function AdDetailPage() {
  const { adId } = useParams({ from: "/ads/$adId" });
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    void loadAd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adId]);

  const loadAd = async () => {
    setLoading(true);
    // RLS allows: approved ads (everyone), own ads (owner), all ads (admin)
    const { data: adData } = await supabase
      .from("ads")
      .select("*")
      .eq("id", adId)
      .maybeSingle();

    if (!adData) {
      setAd(null);
      setLoading(false);
      return;
    }

    const [{ data: cat }, { data: prof }] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name, slug")
        .eq("id", adData.category_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", adData.user_id)
        .maybeSingle(),
    ]);

    setAd({ ...adData, categories: cat, profiles: prof } as Ad);
    setLoading(false);

    // Increment views (fire and forget)
    void supabase
      .from("ads")
      .update({ views_count: (adData.views_count ?? 0) + 1 })
      .eq("id", adId);
  };

  if (loading) {
    return (
      <SiteShell>
        <div className="container mx-auto grid gap-6 px-4 py-8 md:grid-cols-3">
          <Skeleton className="aspect-square rounded-xl md:col-span-2" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </SiteShell>
    );
  }

  if (!ad) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">الإعلان غير موجود</h1>
          <p className="mt-2 text-muted-foreground">قد يكون الإعلان تم حذفه أو غير معتمد</p>
          <Button asChild className="mt-6 gradient-primary text-primary-foreground">
            <Link to="/ads">تصفح كل الإعلانات</Link>
          </Button>
        </div>
      </SiteShell>
    );
  }

  const cover = ad.images?.[activeImage] ?? ad.images?.[0];
  const whatsappMsg = `السلام عليكم، أنا مهتم بإعلان "${ad.title}" على موقع إعلانات العبور`;

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            الرئيسية
          </Link>
          <ArrowRight className="h-3.5 w-3.5 rtl-flip" />
          <Link to="/ads" className="hover:text-primary">
            الإعلانات
          </Link>
          {ad.categories && (
            <>
              <ArrowRight className="h-3.5 w-3.5 rtl-flip" />
              <Link
                to="/categories/$slug"
                params={{ slug: ad.categories.slug }}
                className="hover:text-primary"
              >
                {ad.categories.name}
              </Link>
            </>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Images + description */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden border-border/60">
              <div className="relative aspect-[4/3] bg-muted">
                {cover ? (
                  <img src={cover} alt={ad.title} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-6xl">📦</div>
                )}
                {ad.is_featured && (
                  <Badge className="absolute right-3 top-3 gap-1 bg-gradient-to-l from-amber-500 to-orange-500 text-white shadow-md">
                    <Sparkles className="h-3 w-3" /> مميز
                  </Badge>
                )}
              </div>
              {ad.images && ad.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-3">
                  {ad.images.map((img, i) => (
                    <button
                      key={img}
                      onClick={() => setActiveImage(i)}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                        i === activeImage ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card className="mt-4 border-border/60 p-6">
              <h2 className="mb-3 text-lg font-bold">الوصف</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {ad.description}
              </p>
            </Card>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <Card className="border-border/60 p-6">
              {ad.categories && (
                <Badge variant="secondary" className="mb-3">
                  {ad.categories.name}
                </Badge>
              )}
              <h1 className="text-xl font-bold leading-tight sm:text-2xl">{ad.title}</h1>
              <div className="mt-3 text-3xl font-bold text-primary">
                {formatPrice(ad.price, ad.currency)}
              </div>

              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{ad.location || "مدينة العبور"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <span>{ad.views_count} مشاهدة</span>
                </div>
                <div className="text-xs">{formatRelativeTime(ad.created_at)}</div>
              </div>

              <div className="mt-5 space-y-2">
                <Button
                  asChild
                  size="lg"
                  className="w-full gap-2 bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
                >
                  <a
                    href={buildWhatsAppLink(ad.whatsapp_number, whatsappMsg)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-5 w-5" />
                    تواصل عبر واتساب
                  </a>
                </Button>
              </div>
            </Card>

            {ad.profiles && (
              <Card className="border-border/60 p-4">
                <h3 className="mb-3 text-sm font-bold">البائع</h3>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
                    {ad.profiles.avatar_url ? (
                      <img
                        src={ad.profiles.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {ad.profiles.display_name || "مستخدم"}
                    </div>
                    <div className="text-xs text-muted-foreground">عضو نشط</div>
                  </div>
                </div>
              </Card>
            )}

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              ⚠️ تنبيه: تأكد من معاينة المنتج قبل الدفع. الموقع وسيط للإعلانات فقط ولا يتحمل مسؤولية أي معاملات.
            </div>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
