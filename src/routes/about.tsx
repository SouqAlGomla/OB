import { createFileRoute } from "@tanstack/react-router";
import { Shield, MessageCircle, Sparkles, Users } from "lucide-react";
import { SiteShell } from "@/components/SiteShell";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "عن الموقع — إعلانات العبور" },
      {
        name: "description",
        content: "تعرف على موقع إعلانات مدينة العبور: منصة آمنة لنشر وتصفح الإعلانات المبوبة",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteShell>
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">عن إعلانات العبور</h1>
          <p className="mx-auto mt-3 max-w-2xl text-balance text-muted-foreground">
            منصة الإعلانات المبوبة الأولى المخصصة لسكان مدينة العبور، تجمع البائعين والمشترين في
            مكان واحد آمن وسهل الاستخدام.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {[
            { icon: Shield, title: "أمان أولاً", desc: "كل إعلان يخضع للمراجعة قبل النشر لضمان جودة المحتوى." },
            { icon: MessageCircle, title: "تواصل مباشر", desc: "كلم البائع مباشرة عبر واتساب بدون أي وسطاء." },
            { icon: Sparkles, title: "إعلانات مميزة", desc: "روج إعلانك ليظهر في المقدمة لمشاهدات أكثر." },
            { icon: Users, title: "مجتمع محلي", desc: "خدمة سكان مدينة العبور والمناطق المحيطة." },
          ].map((item, i) => (
            <Card key={i} className="border-border/60 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
