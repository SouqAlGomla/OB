import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AdminCounts = {
  pendingAds: number;
  pendingPayments: number;
  unreadMessages: number;
};

const ORIGINAL_TITLE_KEY = "__originalTitle";

function getOriginalTitle(): string {
  if (typeof document === "undefined") return "";
  const w = window as unknown as Record<string, string | undefined>;
  if (!w[ORIGINAL_TITLE_KEY]) {
    w[ORIGINAL_TITLE_KEY] = document.title.replace(/^\(\d+\)\s*/, "");
  }
  return w[ORIGINAL_TITLE_KEY] || "";
}

function applyTabBadge(total: number) {
  if (typeof document === "undefined") return;
  const base = getOriginalTitle();
  document.title = total > 0 ? `(${total}) ${base}` : base;
}

/**
 * Subscribes to realtime changes for ads, ad_payments, messages.
 * Updates browser tab title with badge count and shows toast notifications
 * when the admin is active.
 */
export function useAdminRealtimeNotifications(isAdmin: boolean) {
  const [counts, setCounts] = useState<AdminCounts>({
    pendingAds: 0,
    pendingPayments: 0,
    unreadMessages: 0,
  });
  const initialLoaded = useRef(false);

  useEffect(() => {
    if (!isAdmin) return;

    const loadCounts = async () => {
      const [adsRes, paysRes, msgsRes] = await Promise.all([
        supabase.from("ads").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("ad_payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("is_from_admin", false).is("read_at", null),
      ]);
      const c: AdminCounts = {
        pendingAds: adsRes.count ?? 0,
        pendingPayments: paysRes.count ?? 0,
        unreadMessages: msgsRes.count ?? 0,
      };
      setCounts(c);
      applyTabBadge(c.pendingAds + c.pendingPayments + c.unreadMessages);
      initialLoaded.current = true;
    };
    void loadCounts();

    const channel = supabase
      .channel("admin-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ads" }, (payload) => {
        const row = payload.new as { status?: string; title?: string };
        if (row.status === "pending") {
          setCounts((p) => {
            const n = { ...p, pendingAds: p.pendingAds + 1 };
            applyTabBadge(n.pendingAds + n.pendingPayments + n.unreadMessages);
            return n;
          });
          if (initialLoaded.current) toast.info(`📢 إعلان جديد: ${row.title ?? ""}`);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ads" }, () => {
        // Refresh counts on status changes
        void loadCounts();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ad_payments" }, () => {
        setCounts((p) => {
          const n = { ...p, pendingPayments: p.pendingPayments + 1 };
          applyTabBadge(n.pendingAds + n.pendingPayments + n.unreadMessages);
          return n;
        });
        if (initialLoaded.current) toast.info("💳 دفعة جديدة بانتظار المراجعة");
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ad_payments" }, () => {
        void loadCounts();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const row = payload.new as { is_from_admin?: boolean; body?: string };
        if (!row.is_from_admin) {
          setCounts((p) => {
            const n = { ...p, unreadMessages: p.unreadMessages + 1 };
            applyTabBadge(n.pendingAds + n.pendingPayments + n.unreadMessages);
            return n;
          });
          if (initialLoaded.current) toast.info(`💬 رسالة جديدة: ${(row.body ?? "").slice(0, 40)}`);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => {
        void loadCounts();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      applyTabBadge(0);
    };
  }, [isAdmin]);

  return counts;
}
