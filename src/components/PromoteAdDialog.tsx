import { useEffect, useState } from "react";
import { Loader2, Sparkles, Upload, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

interface Props {
  adId: string | null;
  adTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PromoteAdDialog({ adId, adTitle, open, onOpenChange, onSuccess }: Props) {
  const { user } = useAuth();
  const [methods, setMethods] = useState<Tables<"payment_methods">[]>([]);
  const [settings, setSettings] = useState<Tables<"site_settings"> | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void Promise.all([
      supabase.from("payment_methods").select("*").eq("is_active", true).order("display_order"),
      supabase.from("site_settings").select("*").limit(1).maybeSingle(),
    ]).then(([m, s]) => {
      setMethods(m.data ?? []);
      setSettings(s.data ?? null);
      if (m.data && m.data.length > 0 && !selectedMethod) {
        setSelectedMethod(m.data[0].id);
      }
    });
  }, [open]);

  const reset = () => {
    setSelectedMethod("");
    setReference("");
    setNotes("");
    setReceiptFile(null);
  };

  const copyToClipboard = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("تم النسخ");
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !adId || !selectedMethod) {
      toast.error("اختر طريقة الدفع");
      return;
    }
    if (!receiptFile) {
      toast.error("ارفع صورة الإيصال");
      return;
    }
    const method = methods.find((m) => m.id === selectedMethod);
    if (!method) return;

    setSubmitting(true);

    // Upload receipt to private bucket
    const ext = receiptFile.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("payments").upload(fileName, receiptFile);
    if (upErr) {
      setSubmitting(false);
      toast.error("فشل رفع الإيصال");
      return;
    }

    const { error } = await supabase.from("ad_payments").insert({
      ad_id: adId,
      user_id: user.id,
      amount: settings?.featured_ad_price ?? 50,
      payment_method: method.display_name,
      transaction_reference: reference.trim() || null,
      receipt_url: fileName,
      notes: notes.trim() || null,
      feature_duration_days: settings?.featured_ad_duration_days ?? 15,
      status: "pending",
    });

    setSubmitting(false);
    if (error) {
      toast.error("فشل إرسال الدفع: " + error.message);
      return;
    }
    toast.success("تم إرسال طلب التمييز! سيتم مراجعة الإيصال خلال ساعات");
    reset();
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            ترقية إلى إعلان مميز
          </DialogTitle>
          <DialogDescription>
            {adTitle && <span className="block font-medium text-foreground">{adTitle}</span>}
            ادفع المبلغ على إحدى الطرق التالية ثم ارفع صورة الإيصال
          </DialogDescription>
        </DialogHeader>

        {/* Pricing card */}
        <div className="rounded-xl border border-amber-200 bg-gradient-to-l from-amber-50 to-orange-50 p-4 dark:border-amber-900/50 dark:from-amber-950/30 dark:to-orange-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-800 dark:text-amber-300">سعر التمييز</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                {settings?.featured_ad_price ?? 50} ج.م
              </p>
            </div>
            <div className="text-end">
              <p className="text-xs text-amber-800 dark:text-amber-300">المدة</p>
              <p className="text-lg font-bold text-amber-900 dark:text-amber-100">
                {settings?.featured_ad_duration_days ?? 15} يوم
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Methods */}
          <div className="space-y-2">
            <Label>اختر طريقة الدفع *</Label>
            {methods.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد طرق دفع متاحة حالياً. تواصل مع الإدارة.
              </p>
            ) : (
              <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod} className="gap-2">
                {methods.map((m) => (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-colors ${
                      selectedMethod === m.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={m.id} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold">{m.display_name}</span>
                        <span className="text-xs text-muted-foreground">{m.method_type}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <code dir="ltr" className="rounded bg-muted px-2 py-0.5 text-sm font-mono">
                          {m.account_number}
                        </code>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.preventDefault();
                            copyToClipboard(m.account_number, m.id);
                          }}
                        >
                          {copiedId === m.id ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                      {m.account_name && (
                        <p className="mt-1 text-xs text-muted-foreground">باسم: {m.account_name}</p>
                      )}
                      {m.instructions && (
                        <p className="mt-1 text-xs text-muted-foreground">{m.instructions}</p>
                      )}
                    </div>
                  </label>
                ))}
              </RadioGroup>
            )}
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label htmlFor="ref">رقم العملية / المرجع (اختياري)</Label>
            <Input
              id="ref"
              dir="ltr"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="رقم التحويل من الرسالة"
            />
          </div>

          {/* Receipt */}
          <div className="space-y-2">
            <Label htmlFor="receipt">صورة الإيصال *</Label>
            <label
              htmlFor="receipt"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-4 transition-colors hover:border-primary"
            >
              <Upload className="h-4 w-4" />
              <span className="text-sm">
                {receiptFile ? receiptFile.name : "اضغط لاختيار صورة"}
              </span>
            </label>
            <input
              id="receipt"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات (اختياري)</Label>
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل إضافية للإدارة"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={submitting || methods.length === 0}
              className="flex-1 gradient-primary text-primary-foreground"
            >
              {submitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              إرسال طلب التمييز
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
