import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, MapPin, MessageCircle } from "lucide-react";

export function Footer({
  siteName = "إعلانات العبور",
  description = "موقع الإعلانات المبوبة الأول في مدينة العبور",
}: {
  siteName?: string;
  description?: string;
}) {
  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-elegant">
                <span className="text-lg font-bold text-primary-foreground">ع</span>
              </div>
              <span className="text-lg font-bold">{siteName}</span>
            </div>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">{description}</p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="mb-3 text-sm font-bold">روابط سريعة</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-primary">
                  الرئيسية
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-primary">
                  الأقسام
                </Link>
              </li>
              <li>
                <Link to="/ads" className="hover:text-primary">
                  كل الإعلانات
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-primary">
                  عن الموقع
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-3 text-sm font-bold">تواصل معنا</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span>مدينة العبور، القاهرة، مصر</span>
              </li>
              <li>
                <Link to="/messages" className="flex items-center gap-2 hover:text-primary">
                  <MessageCircle className="h-4 w-4 shrink-0 text-primary" />
                  <span>مراسلة الإدارة</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {siteName}. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}
