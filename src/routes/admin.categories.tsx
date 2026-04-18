import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getIcon } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategoriesPage,
});

function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Tables<"categories">[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Tables<"categories">> | null>(null);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("categories").select("*").order("display_order");
    setCategories(data ?? []);
    setLoading(false);
  };

  const save = async () => {
    if (!editing?.name || !editing?.slug) {
      toast.error("الاسم والـ slug مطلوبان");
      return;
    }
    const payload = {
      name: editing.name,
      slug: editing.slug,
      icon: editing.icon || "Package",
      description: editing.description || null,
      display_order: editing.display_order ?? 0,
      is_active: editing.is_active ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("categories").update(payload).eq("id", editing.id)
      : await supabase.from("categories").insert(payload);
    if (error) toast.error("فشل الحفظ: " + error.message);
    else {
      toast.success("تم الحفظ");
      setEditing(null);
      await load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا القسم؟")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error("لا يمكن الحذف (قد يحتوي إعلانات)");
    else { toast.success("تم الحذف"); await load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">إدارة الأقسام</h1>
          <p className="mt-1 text-sm text-muted-foreground">{categories.length} قسم</p>
        </div>
        <Button onClick={() => setEditing({})} className="gradient-primary text-primary-foreground">
          <Plus className="ml-1 h-4 w-4" /> قسم جديد
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-16"/>)}</div>
      ) : (
        <div className="space-y-2">
          {categories.map((c) => {
            const Icon = getIcon(c.icon);
            return (
              <Card key={c.id} className="flex items-center gap-3 p-4">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">/{c.slug} • ترتيب {c.display_order} • {c.is_active ? "نشط" : "معطل"}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditing(c)}><Edit className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => remove(c.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "تعديل قسم" : "قسم جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>الاسم</Label>
              <Input value={editing?.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>المعرف (slug) — حروف إنجليزية فقط</Label>
              <Input dir="ltr" value={editing?.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
            </div>
            <div className="space-y-1.5">
              <Label>الأيقونة (Lucide name)</Label>
              <Input dir="ltr" value={editing?.icon ?? ""} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} placeholder="Package, Car, Home..." />
              <p className="text-xs text-muted-foreground">من <span dir="ltr">lucide.dev</span></p>
            </div>
            <div className="space-y-1.5">
              <Label>الوصف</Label>
              <Textarea value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>ترتيب العرض</Label>
              <Input type="number" value={editing?.display_order ?? 0} onChange={(e) => setEditing({ ...editing, display_order: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing?.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              <Label>نشط</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>إلغاء</Button>
            <Button onClick={save} className="gradient-primary text-primary-foreground">حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
