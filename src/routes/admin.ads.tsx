import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, X, Eye, Trash2, Sparkles, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/ads")({
  component: AdminAdsPage,
});

function AdminAdsPage() {
  const [ads, setAds] = useState<Tables<"ads">[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [rejectAd, setRejectAd] = useState<Tables<"ads"> | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("ads").select("*").order("created_at", { ascending: false });
    if (tab !== "all") q = q.eq("status", tab);
    const { data } = await q.limit(100);
    setAds(data ?? []);
    setLoading(false);
  };

  const approve = async (id: string) => {
    const { error } = await supabase.from("ads").update({ status: "approved" }).eq("id", id);
    if (error) toast.error("فشلت العملية");
    else {
      toast.success("تمت الموافقة");
      setAds((p) => p.filter((a) => a.id !== id));
    }
  };

  const reject = async () => {
    if (!rejectAd) return;
    const { error } = await supabase
      .from("ads")
      .update({ status: "rejected", rejection_reason: rejectReason || "غير مطابق للشروط" })
      .eq("id", rejectAd.id);
    if (error) toast.error("فشل الرفض");
    else {
      toast.success("تم الرفض");
      setAds((p) => p.filter((a) => a.id !== rejectAd.id));
    }
    setRejectAd(null);
    setRejectReason("");
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("ads").delete().eq("id", deleteId);
    if (error) toast.error("فشل الحذف");
    else {
      toast.success("تم الحذف");
      setAds((p) => p.filter((a) => a.id !== deleteId));
    }
    setDeleteId(null);
  };

  const filtered = search
    ? ads.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()))
    : ads;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">إدارة الإعلانات</h1>
        <p className="mt-1 text-sm text-muted-foreground">راجع، وافق، ارفض، أو احذف الإعلانات</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="pending">قيد المراجعة</TabsTrigger>
          <TabsTrigger value="approved">منشورة</TabsTrigger>
          <TabsTrigger value="rejected">مرفوضة</TabsTrigger>
          <TabsTrigger value="all">الكل</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث في العنوان..."
          className="pr-10"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">لا توجد إعلانات</Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((ad) => (
            <Card key={ad.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="h-20 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:w-28">
                {ad.images?.[0] ? (
                  <img src={ad.images[0]} alt={ad.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl">📦</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-bold">{ad.title}</h3>
                  {ad.is_featured && (
                    <Badge className="gap-1 bg-gradient-to-l from-amber-500 to-orange-500 text-white">
                      <Sparkles className="h-3 w-3" /> مميز
                    </Badge>
                  )}
                  <Badge variant="outline">{ad.status}</Badge>
                </div>
                <div className="text-sm font-bold text-primary">{formatPrice(ad.price, ad.currency)}</div>
                <div className="text-xs text-muted-foreground">{formatRelativeTime(ad.created_at)}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/ads/$adId" params={{ adId: ad.id }} target="_blank">
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
                {ad.status !== "approved" && (
                  <Button
                    size="sm"
                    onClick={() => approve(ad.id)}
                    className="bg-success text-success-foreground hover:bg-success/90"
                  >
                    <Check className="ml-1 h-4 w-4" /> موافقة
                  </Button>
                )}
                {ad.status !== "rejected" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRejectAd(ad)}
                    className="text-destructive"
                  >
                    <X className="ml-1 h-4 w-4" /> رفض
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setDeleteId(ad.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectAd} onOpenChange={(o) => !o && setRejectAd(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض الإعلان</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>سبب الرفض (اختياري)</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="مثال: محتوى غير مناسب، صور غير واضحة..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectAd(null)}>إلغاء</Button>
            <Button onClick={reject} className="bg-destructive text-destructive-foreground">رفض</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الإعلان نهائياً؟</AlertDialogTitle>
            <AlertDialogDescription>هذا الإجراء لا يمكن التراجع عنه.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
