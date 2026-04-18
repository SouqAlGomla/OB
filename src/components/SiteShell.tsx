import { useEffect, useState, type ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { supabase } from "@/integrations/supabase/client";

interface SiteSettings {
  site_name: string;
  site_description: string;
}

export function SiteShell({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>({
    site_name: "إعلانات العبور",
    site_description: "موقع الإعلانات المبوبة الأول في مدينة العبور",
  });

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("site_name, site_description")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSettings(data);
      });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header siteName={settings.site_name} />
      <main className="flex-1">{children}</main>
      <Footer siteName={settings.site_name} description={settings.site_description} />
    </div>
  );
}
