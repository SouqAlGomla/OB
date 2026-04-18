import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderTree,
  CreditCard,
  Settings,
  Megaphone,
  ArrowRight,
  Sparkles,
  MessageSquare,
  MapPin,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminRealtimeNotifications } from "@/lib/admin-notifications";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; badgeKey?: "pendingAds" | "pendingPayments" | "unreadMessages" };

const navItems: NavItem[] = [
  { to: "/admin", label: "نظرة عامة", icon: LayoutDashboard, exact: true },
  { to: "/admin/ads", label: "الإعلانات", icon: Megaphone, badgeKey: "pendingAds" },
  { to: "/admin/payments", label: "الدفعات والمميز", icon: Sparkles, badgeKey: "pendingPayments" },
  { to: "/admin/messages", label: "الرسائل", icon: MessageSquare, badgeKey: "unreadMessages" },
  { to: "/admin/categories", label: "الأقسام", icon: FolderTree },
  { to: "/admin/areas", label: "المناطق", icon: MapPin },
  { to: "/admin/payment-methods", label: "طرق الدفع", icon: CreditCard },
  { to: "/admin/settings", label: "إعدادات الموقع", icon: Settings },
];

function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const counts = useAdminRealtimeNotifications(isAdmin);

  useEffect(() => {
    if (!loading) setChecking(false);
  }, [loading]);

  if (loading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">يلزم تسجيل الدخول</h1>
          <Button asChild className="mt-4 gradient-primary text-primary-foreground">
            <Link to="/auth">تسجيل دخول</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">غير مصرح بالدخول</h1>
          <p className="mt-2 text-muted-foreground">هذه الصفحة مخصصة للأدمن فقط</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/">العودة للرئيسية</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30 lg:flex-row" dir="rtl">
      {/* Sidebar */}
      <aside className="border-l border-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:h-screen lg:w-64">
        <div className="flex items-center justify-between border-b border-sidebar-border p-4">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-elegant">
              <span className="font-bold text-primary-foreground">ع</span>
            </div>
            <span className="font-bold">لوحة التحكم</span>
          </Link>
          <Button asChild variant="ghost" size="sm" className="lg:hidden">
            <Link to="/">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <nav className="flex flex-row gap-1 overflow-x-auto p-2 lg:flex-col">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            const badge = item.badgeKey ? counts[item.badgeKey] : 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-elegant"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {badge > 0 && (
                  <Badge className="h-5 min-w-5 justify-center rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">
                    {badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="hidden lg:block lg:border-t lg:border-sidebar-border lg:p-4">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/">
              <ArrowRight className="ml-1 h-4 w-4" />
              العودة للموقع
            </Link>
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
