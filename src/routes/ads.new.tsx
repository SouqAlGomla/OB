import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Upload, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { SiteShell } from "@/components/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/ads/new")({
  component: NewAdPage,
});

function NewAdPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Tables<"categories">[]>([]);
  const [areas, setAreas] = useState<Tables<"areas">[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [areaId, setAreaId] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [makeFeatured, setMakeFeatured] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth" });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    void Promise.all([
      supabase.from("categories").select("*").eq("is_active", true).order("display_order"),
      supabase.from("areas").select("*").eq("is_active", true).order("display_order"),
    ]).then(([cats, ars]) => {
      setCategories(cats.data ?? []);
      setAreas(ars.data ?? []);
    });
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    const files = Array.from(e.target.files);
    if (images.length + files.length > 6) {
      toast.error("الحد الأقصى 6 صور");
      return;
    }
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: الحجم أكبر من 5 ميجا`);
        continue;
      }
      const ext = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("ads").upload(fileName, file);
      if (error) {
        toast.error(`فشل رفع ${file.name}`);
        continue;
      }
      const { data } = supabase.storage.from("ads").getPublicUrl(fileName);
      uploaded.push(data.publicUrl);
    }
    setImages((prev) => [...prev, ...uploaded]);
    setUploading(false);
    e.target.value = "";
  };

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((u) => u !== url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!categoryId) {
      toast.error("اختر القسم");
      return;
    }
    if (!areaId) {
      toast.error("اختر الحي");
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      toast.error("السعر مطلوب");
      return;
    }
    const waDigits = whatsapp.replace(/\D/g, "");
    if (waDigits.length !== 11) {
      toast.error("رقم الواتساب يجب أن يكون 11 رقم بالضبط");
      return;
    }
    const selectedArea = areas.find((a) => a.id === areaId);
    setSubmitting(true);
    const { data, error } = await supabase
      .from("ads")
      .insert({
        user_id: user.id,
        category_id: categoryId,
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        location: selectedArea?.name ?? null,
        whatsapp_number: waDigits,
        images,
        status: "pending",
      })
      .select()
      .single();
    setSubmitting(false);

    if (error) {
      toast.error("فشل إنشاء الإعلان: " + error.message);
      return;
    }

    toast.success("تم إرسال إعلانك! سيظهر بعد موافقة الإدارة");
    if (makeFeatured && data) {
      navigate({ to: "/my-ads", hash: `promote=${data.id}` });
    } else {
      navigate({ to: "/my-ads" });
    }
  };

  if (authLoading) {
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
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold sm:text-3xl">إضافة إعلان جديد</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            املأ البيانات وسيظهر إعلانك بعد موافقة الإدارة
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-border/60">
            <CardContent className="space-y-5 p-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">عنوان الإعلان *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={120}
                  placeholder="مثال: تويوتا كورولا 2020 فبريكا"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>القسم *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="desc">الوصف *</Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={5}
                  maxLength={2000}
                  placeholder="اكتب تفاصيل واضحة عن الإعلان..."
                />
              </div>

              {/* Price + Area */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">السعر *</Label>
                  <div className="relative">
                    <Input
                      id="price"
                      type="number"
                      min="1"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                      placeholder="0"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      ج.م
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>الحي *</Label>
                  <Select value={areaId} onValueChange={setAreaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحي" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="space-y-2">
                <Label htmlFor="wa">رقم الواتساب * (11 رقم)</Label>
                <Input
                  id="wa"
                  type="tel"
                  dir="ltr"
                  inputMode="numeric"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  required
                  maxLength={11}
                  pattern="[0-9]{11}"
                  placeholder="01012345678"
                />
                <p className="text-xs text-muted-foreground">
                  أرقام فقط — 11 رقم بالضبط (مثال: 01012345678)
                </p>
              </div>

              {/* Images */}
              <div className="space-y-2">
                <Label>الصور (حتى 6 صور)</Label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {images.map((url) => (
                    <div key={url} className="relative aspect-square overflow-hidden rounded-lg border">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {images.length < 6 && (
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                      {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-5 w-5" />
                          <span className="text-[10px]">إضافة</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Featured */}
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="featured" className="font-bold text-amber-900 dark:text-amber-100">
                      اجعله إعلان مميز
                    </Label>
                    <Switch id="featured" checked={makeFeatured} onCheckedChange={setMakeFeatured} />
                  </div>
                  <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                    الإعلان المميز يظهر في الأعلى ويحصل على مشاهدات أكثر. سيتم توجيهك لصفحة الدفع بعد إنشاء الإعلان.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex gap-3">
            <Button asChild variant="outline" className="flex-1">
              <Link to="/">إلغاء</Link>
            </Button>
            <Button
              type="submit"
              disabled={submitting || uploading}
              className="flex-1 gradient-primary text-primary-foreground shadow-elegant"
            >
              {submitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              نشر الإعلان
            </Button>
          </div>
        </form>
      </div>
    </SiteShell>
  );
}
