import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getIcon } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/payment-methods")({
  component: AdminPaymentMethodsPage,
});

function AdminPaymentMethodsPage() {
  const [methods, setMethods] = useState<Tables<"payment_methods">[]>([]);
  const [editing, setEditing] = useState<Partial<Tables<"payment_methods">> | null>(null);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    const { data } = await supabase.from("payment_methods").select("*").order("display_order");
    setMethods(data ?? []);
  };

  const save = async () => {
    if (!editing?.method_type || !editing?.display_name || !editing?.account_number) {
      toast.error("املأ كل الحقول الأساسية");
      return;
    }
    const payload = {
      method_type: editing.method_type,
      display_name: editing.display_name,
      account_number: editing.account_number,
      account_name: editing.account_name || null,
      instructions: editing.instructions || null,
      icon: editing.icon || "CreditCard",
      is_active: editing.is_active ?? true,
      display_order: editing.display_order ?? 0,
    };
    const { error } = editing.id
      ? await supabase.from("payment_methods").update(payload).eq("id", editing.id)
      : await supabase.from("payment_methods").insert(payload);
    if (error) toast.error("فشل الحفظ");
    else { toast.success("تم الحفظ"); setEditing(null); await load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف؟")) return;
    await supabase.from("payment_methods").delete().eq("id", id);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">طرق الدفع</h1>
          <p className="mt-1 text-sm text-muted-foreground">إنستاباي، فودافون كاش، وغيرها</p>
        </div>
        <Button onClick={() => setEditing({})} className="gradient-primary text-primary-foreground">
          <Plus className="ml-1 h-4 w-4" /> طريقة جديدة
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {methods.map((m) => {
          const Icon = getIcon(m.icon);
          return (
            <Card key={m.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{m.display_name}</h3>
                    {!m.is_active && <span className="text-xs text-muted-foreground">(معطل)</span>}
                  </div>
                  <div className="mt-1 text-sm" dir="ltr">{m.account_number}</div>
                  {m.account_name && <div className="text-xs text-muted-foreground">{m.account_name}</div>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(m)}><Edit className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(m.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "تعديل" : "طريقة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>النوع (مثال: instapay، vodafone_cash)</Label>
              <Input dir="ltr" value={editing?.method_type ?? ""} onChange={(e) => setEditing({ ...editing, method_type: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>الاسم المعروض</Label>
              <Input value={editing?.display_name ?? ""} onChange={(e) => setEditing({ ...editing, display_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>رقم الحساب / المعرف</Label>
              <Input dir="ltr" value={editing?.account_number ?? ""} onChange={(e) => setEditing({ ...editing, account_number: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>اسم صاحب الحساب</Label>
              <Input value={editing?.account_name ?? ""} onChange={(e) => setEditing({ ...editing, account_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>تعليمات إضافية</Label>
              <Textarea value={editing?.instructions ?? ""} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>الأيقونة (Lucide)</Label>
              <Input dir="ltr" value={editing?.icon ?? ""} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} placeholder="CreditCard, Smartphone..." />
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
