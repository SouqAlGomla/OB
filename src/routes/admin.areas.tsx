import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/areas")({
  component: AdminAreasPage,
});

function AdminAreasPage() {
  const [areas, setAreas] = useState<Tables<"areas">[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Tables<"areas">> | null>(null);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("areas").select("*").order("display_order");
    setAreas(data ?? []);
    setLoading(false);
  };

  const save = async () => {
    if (!editing?.name?.trim()) {
      toast.error("اسم الحي مطلوب");
      return;
    }
    const payload = {
      name: editing.name.trim(),
      display_order: editing.display_order ?? 0,
      is_active: editing.is_active ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("areas").update(payload).eq("id", editing.id)
      : await supabase.from("areas").insert(payload);
    if (error) toast.error("فشل الحفظ: " + error.message);
    else {
      toast.success("تم الحفظ");
      setEditing(null);
      await load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا الحي؟")) return;
    const { error } = await supabase.from("areas").delete().eq("id", id);
    if (error) toast.error("فشل الحذف");
    else { toast.success("تم الحذف"); await load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">إدارة المناطق (الأحياء)</h1>
          <p className="mt-1 text-sm text-muted-foreground">{areas.length} حي</p>
        </div>
        <Button onClick={() => setEditing({ display_order: areas.length + 1, is_active: true })} className="gradient-primary text-primary-foreground">
          <Plus className="ml-1 h-4 w-4" /> حي جديد
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-16"/>)}</div>
      ) : (
        <div className="space-y-2">
          {areas.map((a) => (
            <Card key={a.id} className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold">{a.name}</div>
                <div className="text-xs text-muted-foreground">ترتيب {a.display_order} • {a.is_active ? "نشط" : "معطل"}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditing(a)}><Edit className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => remove(a.id)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "تعديل حي" : "حي جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>اسم الحي</Label>
              <Input value={editing?.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="مثال: الحي الأول" />
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
