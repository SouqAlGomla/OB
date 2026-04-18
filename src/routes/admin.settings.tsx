import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const [s, setS] = useState<Partial<Tables<"site_settings">> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("*").limit(1).maybeSingle().then(({ data }) => setS(data));
  }, []);

  const save = async () => {
    if (!s?.id) return;
    setSaving(true);
    const { error } = await supabase.from("site_settings").update({
      site_name: s.site_name,
      site_description: s.site_description,
      logo_url: s.logo_url,
      keywords: s.keywords,
      contact_email: s.contact_email,
      contact_phone: s.contact_phone,
      facebook_url: s.facebook_url,
      instagram_url: s.instagram_url,
      featured_ad_price: s.featured_ad_price,
      featured_ad_duration_days: s.featured_ad_duration_days,
    }).eq("id", s.id);
    setSaving(false);
    if (error) toast.error("فشل الحفظ");
    else toast.success("تم الحفظ! حدث الصفحة لمشاهدة التغييرات");
  };

  if (!s) return <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">إعدادات الموقع</h1>
        <p className="mt-1 text-sm text-muted-foreground">اسم الموقع، الوصف، اللوجو، SEO</p>
      </div>

      <Card>
        <CardHeader><CardTitle>الهوية</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label>اسم الموقع</Label><Input value={s.site_name ?? ""} onChange={(e) => setS({ ...s, site_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>الوصف</Label><Textarea value={s.site_description ?? ""} onChange={(e) => setS({ ...s, site_description: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>رابط اللوجو</Label><Input dir="ltr" value={s.logo_url ?? ""} onChange={(e) => setS({ ...s, logo_url: e.target.value })} placeholder="https://..." /></div>
          <div className="space-y-1.5"><Label>الكلمات المفتاحية (SEO)</Label><Textarea value={s.keywords ?? ""} onChange={(e) => setS({ ...s, keywords: e.target.value })} placeholder="مفصولة بفاصلة" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>التواصل والسوشيال ميديا</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label>إيميل التواصل</Label><Input dir="ltr" value={s.contact_email ?? ""} onChange={(e) => setS({ ...s, contact_email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>رقم الهاتف</Label><Input dir="ltr" value={s.contact_phone ?? ""} onChange={(e) => setS({ ...s, contact_phone: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Facebook</Label><Input dir="ltr" value={s.facebook_url ?? ""} onChange={(e) => setS({ ...s, facebook_url: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Instagram</Label><Input dir="ltr" value={s.instagram_url ?? ""} onChange={(e) => setS({ ...s, instagram_url: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>إعدادات الإعلانات المميزة</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>سعر الإعلان المميز (ج.م)</Label>
            <Input type="number" value={s.featured_ad_price ?? 0} onChange={(e) => setS({ ...s, featured_ad_price: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="space-y-1.5"><Label>المدة (يوم)</Label>
            <Input type="number" value={s.featured_ad_duration_days ?? 7} onChange={(e) => setS({ ...s, featured_ad_duration_days: parseInt(e.target.value) || 7 })} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} size="lg" className="gradient-primary text-primary-foreground shadow-elegant">
        {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
        حفظ كل التغييرات
      </Button>
    </div>
  );
}
