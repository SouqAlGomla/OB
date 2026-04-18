import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, X, ExternalLink, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import { toast } from "sonner";

type PaymentRow = Tables<"ad_payments"> & {
  ads: Pick<Tables<"ads">, "id" | "title"> | null;
};

export const Route = createFileRoute("/admin/payments")({
  component: AdminPaymentsPage,
});

function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [featuredDays, setFeaturedDays] = useState(7);

  useEffect(() => {
    supabase.from("site_settings").select("featured_ad_duration_days").limit(1).maybeSingle()
      .then(({ data }) => data && setFeaturedDays(data.featured_ad_duration_days));
  }, []);

  useEffect(() => { void load(); }, [tab]);

  const load = async () => {
    const { data } = await supabase
      .from("ad_payments")
      .select("*, ads(id, title)")
      .eq("status", tab)
      .order("created_at", { ascending: false });
    setPayments((data ?? []) as PaymentRow[]);
  };

  const approve = async (p: PaymentRow) => {
    const featuredUntil = new Date();
    featuredUntil.setDate(featuredUntil.getDate() + (p.feature_duration_days || featuredDays));

    const [r1, r2] = await Promise.all([
      supabase.from("ad_payments").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", p.id),
      supabase.from("ads").update({ is_featured: true, featured_until: featuredUntil.toISOString() }).eq("id", p.ad_id),
    ]);
    if (r1.error || r2.error) toast.error("فشل");
    else { toast.success("تمت الموافقة وتفعيل الإعلان المميز"); await load(); }
  };

  const reject = async (id: string) => {
    const { error } = await supabase.from("ad_payments").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error("فشل");
    else { toast.success("تم الرفض"); await load(); }
  };

  const downloadReceipt = async (url: string) => {
    if (!url) return;
    // payments bucket is private, generate signed url
    const path = url.includes("/payments/") ? url.split("/payments/")[1] : url;
    const { data } = await supabase.storage.from("payments").createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">دفعات الإعلانات المميزة</h1>
        <p className="mt-1 text-sm text-muted-foreground">راجع إيصالات الدفع ووافق على تفعيل الإعلانات المميزة</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="pending">قيد المراجعة</TabsTrigger>
          <TabsTrigger value="approved">موافق عليها</TabsTrigger>
          <TabsTrigger value="rejected">مرفوضة</TabsTrigger>
        </TabsList>
      </Tabs>

      {payments.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">لا توجد دفعات</Card>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-bold">{p.ads?.title ?? "إعلان محذوف"}</h3>
                    <Badge variant="outline">{p.payment_method}</Badge>
                  </div>
                  <div className="mt-1 text-lg font-bold text-primary">{formatPrice(p.amount, "EGP")}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatRelativeTime(p.created_at)} • {p.feature_duration_days} يوم
                  </div>
                  {p.transaction_reference && (
                    <div className="mt-1 text-xs" dir="ltr">رقم العملية: {p.transaction_reference}</div>
                  )}
                  {p.notes && <p className="mt-2 text-sm">{p.notes}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.receipt_url && (
                    <Button size="sm" variant="outline" onClick={() => downloadReceipt(p.receipt_url!)}>
                      <ExternalLink className="ml-1 h-4 w-4" /> الإيصال
                    </Button>
                  )}
                  {p.ads && (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/ads/$adId" params={{ adId: p.ads.id }} target="_blank">عرض الإعلان</Link>
                    </Button>
                  )}
                  {tab === "pending" && (
                    <>
                      <Button size="sm" onClick={() => approve(p)} className="bg-success text-success-foreground">
                        <Check className="ml-1 h-4 w-4" /> موافقة
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => reject(p.id)} className="text-destructive">
                        <X className="ml-1 h-4 w-4" /> رفض
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
