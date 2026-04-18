import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Send, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { SiteShell } from "@/components/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Tables<"messages">[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    void load();

    const channel = supabase
      .channel(`messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_user_id=eq.${user.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Tables<"messages">]);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_user_id", user.id)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
    setLoading(false);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim()) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_user_id: user.id,
      sender_id: user.id,
      is_from_admin: false,
      body: text.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("فشل إرسال الرسالة");
      return;
    }
    setText("");
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
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-4 flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">المحادثة مع الإدارة</h1>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          هنا تقدر تتواصل مع فريق الإدارة مباشرة لأي استفسار أو شكوى
        </p>

        <div className="flex h-[60vh] flex-col rounded-2xl border border-border/60 bg-card shadow">
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <MessageCircle className="mb-3 h-12 w-12 opacity-30" />
                <p>لا توجد رسائل بعد</p>
                <p className="mt-1 text-xs">ابدأ المحادثة بإرسال رسالة</p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.is_from_admin ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      m.is_from_admin
                        ? "bg-muted text-foreground"
                        : "gradient-primary text-primary-foreground"
                    }`}
                  >
                    {m.is_from_admin && (
                      <p className="mb-0.5 text-[10px] font-bold opacity-70">الإدارة</p>
                    )}
                    <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                    <p className="mt-1 text-[10px] opacity-60">
                      {new Date(m.created_at).toLocaleString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={send} className="flex gap-2 border-t border-border/60 p-3">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="اكتب رسالتك..."
              maxLength={4000}
            />
            <Button
              type="submit"
              disabled={sending || !text.trim()}
              className="gradient-primary text-primary-foreground"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </SiteShell>
  );
}
