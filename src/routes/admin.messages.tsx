import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Send, MessageCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/messages")({
  component: AdminMessagesPage,
});

interface Conversation {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  last_message: string;
  last_at: string;
  unread: number;
}

function AdminMessagesPage() {
  const { user, isAdmin } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filtered, setFiltered] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Tables<"messages">[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAdmin) void loadConversations();
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedUser) return;
    void loadMessages(selectedUser);

    const channel = supabase
      .channel(`admin-msg-${selectedUser}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_user_id=eq.${selectedUser}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Tables<"messages">]);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedUser]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(conversations);
    } else {
      const q = search.toLowerCase();
      setFiltered(
        conversations.filter(
          (c) =>
            c.display_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q),
        ),
      );
    }
  }, [search, conversations]);

  const loadConversations = async () => {
    setLoading(true);
    const { data: msgs } = await supabase
      .from("messages")
      .select("conversation_user_id, body, created_at, is_from_admin, read_at")
      .order("created_at", { ascending: false });

    if (!msgs) {
      setLoading(false);
      return;
    }

    const map = new Map<string, { last_message: string; last_at: string; unread: number }>();
    for (const m of msgs) {
      const existing = map.get(m.conversation_user_id);
      if (!existing) {
        map.set(m.conversation_user_id, {
          last_message: m.body,
          last_at: m.created_at,
          unread: !m.is_from_admin && !m.read_at ? 1 : 0,
        });
      } else if (!m.is_from_admin && !m.read_at) {
        existing.unread += 1;
      }
    }

    const userIds = Array.from(map.keys());
    if (userIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, email, avatar_url")
      .in("id", userIds);

    const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const convs: Conversation[] = userIds.map((id) => {
      const meta = map.get(id)!;
      const p = profMap.get(id);
      return {
        user_id: id,
        display_name: p?.display_name ?? null,
        email: p?.email ?? null,
        avatar_url: p?.avatar_url ?? null,
        ...meta,
      };
    });
    convs.sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime());
    setConversations(convs);
    setLoading(false);
  };

  const loadMessages = async (userId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_user_id", userId)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
    // Mark user messages as read
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_user_id", userId)
      .eq("is_from_admin", false)
      .is("read_at", null);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedUser || !text.trim()) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_user_id: selectedUser,
      sender_id: user.id,
      is_from_admin: true,
      body: text.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("فشل الإرسال");
      return;
    }
    setText("");
    void loadConversations();
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">غير مصرح</p>
      </div>
    );
  }

  const selectedConv = conversations.find((c) => c.user_id === selectedUser);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">الرسائل</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          محادثات مع المستخدمين ({conversations.length})
        </p>
      </div>

      <div className="grid h-[calc(100vh-220px)] gap-4 lg:grid-cols-[320px_1fr]">
        {/* Conversations sidebar */}
        <div className="flex flex-col rounded-2xl border border-border/60 bg-card">
          <div className="border-b border-border/60 p-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث..."
                className="pr-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                لا توجد محادثات
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.user_id}
                  onClick={() => setSelectedUser(c.user_id)}
                  className={`flex w-full items-start gap-3 border-b border-border/40 p-3 text-right transition-colors hover:bg-muted/50 ${
                    selectedUser === c.user_id ? "bg-muted" : ""
                  }`}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={c.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {(c.display_name || c.email || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold">
                        {c.display_name || c.email?.split("@")[0] || "مستخدم"}
                      </p>
                      {c.unread > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                          {c.unread}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{c.last_message}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex flex-col rounded-2xl border border-border/60 bg-card">
          {!selectedUser ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <MessageCircle className="mb-3 h-12 w-12 opacity-30" />
              <p>اختر محادثة لعرضها</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border/60 p-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={selectedConv?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {(selectedConv?.display_name || selectedConv?.email || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-bold">
                    {selectedConv?.display_name || selectedConv?.email?.split("@")[0]}
                  </p>
                  <p className="text-xs text-muted-foreground">{selectedConv?.email}</p>
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.is_from_admin ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        m.is_from_admin
                          ? "gradient-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                      <p className="mt-1 text-[10px] opacity-60">
                        {new Date(m.created_at).toLocaleString("ar-EG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={send} className="flex gap-2 border-t border-border/60 p-3">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="اكتب ردك..."
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
