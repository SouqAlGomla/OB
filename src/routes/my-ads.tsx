import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, Trash2, Sparkles, Plus, Loader2, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { SiteShell } from "@/components/SiteShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import { PromoteAdDialog } from "@/components/PromoteAdDialog";
import { toast } from "sonner";

const statusBadge = {
  pending: { label: "قيد المراجعة", class: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  approved: { label: "منشور", class: "bg-success/15 text-success" },
  rejected: { label: "مرفوض", class: "bg-destructive/15 text-destructive" },
  expired: { label: "منتهي", class: "bg-muted text-muted-foreground" },
};

export const Route = createFileRoute("/my-ads")({
  component: MyAdsPage,
});

function MyAdsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [ads, setAds] = useState<Tables<"ads">[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [promoteAd, setPromoteAd] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Auto-open promote dialog if hash is set (from ads/new flow)
  useEffect(() => {
    if (ads.length === 0) return;
    const hash = window.location.hash;
    const m = hash.match(/promote=([0-9a-f-]+)/i);
    if (m) {
      const ad = ads.find((a) => a.id === m[1]);
      if (ad) {
        setPromoteAd({ id: ad.id, title: ad.title });
        history.replaceState(null, "", window.location.pathname);
      }
    }
  }, [ads]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [adsRes, payRes] = await Promise.all([
      supabase
        .from("ads")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("ad_payments")
        .select("ad_id")
        .eq("user_id", user.id)
        .eq("status", "pending"),
    ]);
    setAds(adsRes.data ?? []);
    setPendingPayments(new Set((payRes.data ?? []).map((p) => p.ad_id)));
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("ads").delete().eq("id", deleteId);
    if (error) {
      toast.error("فشل حذف الإعلان");
    } else {
      toast.success("تم حذف الإعلان");
      setAds((prev) => prev.filter((a) => a.id !== deleteId));
    }
    setDeleteId(null);
  };

  const daysUntilExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const ms = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  if (authLoading || loading) {
    return (
      <SiteShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">إعلاناتي</h1>
            <p className="mt-1 text-sm text-muted-foreground">{ads.length} إعلان</p>
          </div>
          <Button asChild className="gradient-primary text-primary-foreground shadow-elegant">
            <Link to="/ads/new">
              <Plus className="ml-1 h-4 w-4" /> إعلان جديد
            </Link>
          </Button>
        </div>

        {ads.length === 0 ? (
          <Card className="border-dashed p-12 text-center">
            <p className="text-muted-foreground">ليس لديك إعلانات بعد</p>
            <Button asChild className="mt-4 gradient-primary text-primary-foreground">
              <Link to="/ads/new">أنشئ أول إعلان</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {ads.map((ad) => {
              const sb = statusBadge[ad.status];
              const days = daysUntilExpiry(ad.expires_at);
              const isPending = pendingPayments.has(ad.id);
              return (
                <Card key={ad.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="h-24 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:h-20 sm:w-28">
                    {ad.images?.[0] ? (
                      <img src={ad.images[0]} alt={ad.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl">📦</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{ad.title}</h3>
                      <Badge variant="secondary" className={sb.class}>
                        {sb.label}
                      </Badge>
                      {ad.is_featured && (
                        <Badge className="gap-1 bg-gradient-to-l from-amber-500 to-orange-500 text-white">
                          <Sparkles className="h-3 w-3" /> مميز
                        </Badge>
                      )}
                      {isPending && (
                        <Badge variant="outline" className="gap-1 border-amber-400 text-amber-700 dark:text-amber-300">
                          <Clock className="h-3 w-3" /> دفع قيد المراجعة
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-sm font-bold text-primary">
                      {formatPrice(ad.price, ad.currency)}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {ad.views_count} مشاهدة
                      </span>
                      <span>{formatRelativeTime(ad.created_at)}</span>
                      {days !== null && days > 0 && days <= 3 && ad.status === "approved" && (
                        <span className="flex items-center gap-1 font-bold text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          ينتهي خلال {days} {days === 1 ? "يوم" : "أيام"}
                        </span>
                      )}
                    </div>
                    {ad.status === "rejected" && ad.rejection_reason && (
                      <p className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                        سبب الرفض: {ad.rejection_reason}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ad.status === "approved" && !ad.is_featured && !isPending && (
                      <Button
                        size="sm"
                        onClick={() => setPromoteAd({ id: ad.id, title: ad.title })}
                        className="gap-1 bg-gradient-to-l from-amber-500 to-orange-500 text-white hover:opacity-90"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        تمييز
                      </Button>
                    )}
                    {ad.status === "approved" && (
                      <Button asChild variant="outline" size="sm">
                        <Link to="/ads/$adId" params={{ adId: ad.id }}>
                          عرض
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteId(ad.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الإعلان؟</AlertDialogTitle>
            <AlertDialogDescription>
              هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الإعلان نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PromoteAdDialog
        adId={promoteAd?.id ?? null}
        adTitle={promoteAd?.title}
        open={!!promoteAd}
        onOpenChange={(o) => !o && setPromoteAd(null)}
        onSuccess={load}
      />
    </SiteShell>
  );
}
