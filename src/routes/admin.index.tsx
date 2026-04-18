import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Megaphone, Users, Eye, Sparkles, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

interface Stats {
  totalAds: number;
  pendingAds: number;
  approvedAds: number;
  featuredAds: number;
  totalUsers: number;
  totalViews: number;
  pendingPayments: number;
  byCategory: { name: string; value: number }[];
  trend: { date: string; ads: number }[];
}

const COLORS = [
  "oklch(0.52 0.21 255)",
  "oklch(0.65 0.17 150)",
  "oklch(0.78 0.16 80)",
  "oklch(0.6 0.23 27)",
  "oklch(0.55 0.2 295)",
  "oklch(0.7 0.15 200)",
  "oklch(0.6 0.2 340)",
  "oklch(0.65 0.18 100)",
];

function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    const [
      total,
      pending,
      approved,
      featured,
      users,
      views,
      payments,
      cats,
      ads,
    ] = await Promise.all([
      supabase.from("ads").select("id", { count: "exact", head: true }),
      supabase.from("ads").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("ads").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("ads").select("id", { count: "exact", head: true }).eq("is_featured", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("ads").select("views_count"),
      supabase.from("ad_payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("categories").select("id, name"),
      supabase.from("ads").select("id, category_id, created_at"),
    ]);

    const totalViews = (views.data ?? []).reduce((s, a) => s + (a.views_count ?? 0), 0);

    const catMap = new Map((cats.data ?? []).map((c) => [c.id, c.name]));
    const catCount: Record<string, number> = {};
    (ads.data ?? []).forEach((a) => {
      const n = catMap.get(a.category_id) ?? "?";
      catCount[n] = (catCount[n] ?? 0) + 1;
    });
    const byCategory = Object.entries(catCount).map(([name, value]) => ({ name, value }));

    // Trend: last 7 days
    const trendMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
      trendMap[key] = 0;
    }
    (ads.data ?? []).forEach((a) => {
      const d = new Date(a.created_at);
      const key = d.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
      if (key in trendMap) trendMap[key]++;
    });
    const trend = Object.entries(trendMap).map(([date, ads]) => ({ date, ads }));

    setStats({
      totalAds: total.count ?? 0,
      pendingAds: pending.count ?? 0,
      approvedAds: approved.count ?? 0,
      featuredAds: featured.count ?? 0,
      totalUsers: users.count ?? 0,
      totalViews,
      pendingPayments: payments.count ?? 0,
      byCategory,
      trend,
    });
  };

  if (!stats) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    { label: "إجمالي الإعلانات", value: stats.totalAds, icon: Megaphone, color: "text-primary", bg: "bg-primary/10" },
    { label: "قيد المراجعة", value: stats.pendingAds, icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10" },
    { label: "المستخدمون", value: stats.totalUsers, icon: Users, color: "text-success", bg: "bg-success/10" },
    { label: "إجمالي المشاهدات", value: stats.totalViews, icon: Eye, color: "text-purple-600", bg: "bg-purple-500/10" },
    { label: "إعلانات مميزة", value: stats.featuredAds, icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "دفعات منتظرة", value: stats.pendingPayments, icon: TrendingUp, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "إعلانات منشورة", value: stats.approvedAds, icon: Megaphone, color: "text-success", bg: "bg-success/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">نظرة عامة</h1>
        <p className="mt-1 text-sm text-muted-foreground">إحصائيات لحظية عن أداء الموقع</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <Card key={i} className="border-border/60 shadow-card">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="mt-1 text-2xl font-bold">{c.value.toLocaleString("ar-EG")}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.bg} ${c.color}`}>
                <c.icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">إعلانات آخر 7 أيام</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.trend}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="ads" stroke="oklch(0.52 0.21 255)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">التوزيع حسب القسم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {stats.byCategory.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  لا توجد بيانات
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.byCategory} dataKey="value" nameKey="name" outerRadius={80} label>
                      {stats.byCategory.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
