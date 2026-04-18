import { Link, useNavigate } from "@tanstack/react-router";
import { Moon, Sun, LogOut, LayoutDashboard, PlusCircle, User as UserIcon, Menu, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Header({ siteName = "إعلانات العبور" }: { siteName?: string }) {
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const navLinks = (
    <>
      <Link
        to="/"
        className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
        activeProps={{ className: "text-primary font-bold" }}
        activeOptions={{ exact: true }}
        onClick={() => setMobileOpen(false)}
      >
        الرئيسية
      </Link>
      <Link
        to="/categories"
        className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
        activeProps={{ className: "text-primary font-bold" }}
        onClick={() => setMobileOpen(false)}
      >
        الأقسام
      </Link>
      <Link
        to="/ads"
        className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
        activeProps={{ className: "text-primary font-bold" }}
        onClick={() => setMobileOpen(false)}
      >
        كل الإعلانات
      </Link>
      <Link
        to="/about"
        className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
        activeProps={{ className: "text-primary font-bold" }}
        onClick={() => setMobileOpen(false)}
      >
        عن الموقع
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-elegant">
            <span className="text-lg font-bold text-primary-foreground">ع</span>
          </div>
          <span className="hidden text-lg font-bold text-foreground sm:inline">{siteName}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">{navLinks}</nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="تبديل الوضع"
            className="h-9 w-9"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user ? (
            <>
              <Button
                asChild
                size="sm"
                className="hidden gradient-primary text-primary-foreground shadow-elegant hover:opacity-90 sm:inline-flex"
              >
                <Link to="/ads/new">
                  <PlusCircle className="ml-1 h-4 w-4" />
                  أضف إعلان
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {(user.user_metadata?.full_name || user.email || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex flex-col px-2 py-1.5">
                    <span className="text-sm font-medium">
                      {user.user_metadata?.full_name || user.email?.split("@")[0]}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <UserIcon className="ml-2 h-4 w-4" />
                      ملفي الشخصي
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-ads" className="cursor-pointer">
                      <PlusCircle className="ml-2 h-4 w-4" />
                      إعلاناتي
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/messages" className="cursor-pointer">
                      <MessageCircle className="ml-2 h-4 w-4" />
                      مراسلة الإدارة
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="cursor-pointer">
                          <LayoutDashboard className="ml-2 h-4 w-4" />
                          لوحة التحكم
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="ml-2 h-4 w-4" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              asChild
              size="sm"
              className="gradient-primary text-primary-foreground shadow-elegant hover:opacity-90"
            >
              <Link to="/auth">دخول</Link>
            </Button>
          )}

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <nav className="mt-8 flex flex-col gap-4">{navLinks}</nav>
              {user && (
                <Button
                  asChild
                  className="mt-6 w-full gradient-primary text-primary-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  <Link to="/ads/new">
                    <PlusCircle className="ml-1 h-4 w-4" />
                    أضف إعلان جديد
                  </Link>
                </Button>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
