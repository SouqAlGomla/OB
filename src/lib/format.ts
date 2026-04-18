import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Resolve a Lucide icon by name (string from DB).
 * Falls back to Package if name is invalid.
 */
export function getIcon(name?: string | null): LucideIcon {
  if (!name) return Icons.Package;
  const Icon = (Icons as unknown as Record<string, LucideIcon>)[name];
  return Icon ?? Icons.Package;
}

export function formatPrice(price: number | null | undefined, currency = "EGP"): string {
  if (price === null || price === undefined) return "السعر عند التواصل";
  const symbol = currency === "EGP" ? "ج.م" : currency;
  return `${price.toLocaleString("ar-EG")} ${symbol}`;
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "الآن";
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 30) return `منذ ${diffDays} يوم`;
  return date.toLocaleDateString("ar-EG");
}

export function buildWhatsAppLink(phone: string, message?: string): string {
  // Normalize: remove non-digits, ensure country code
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) clean = "20" + clean.slice(1);
  else if (!clean.startsWith("20")) clean = "20" + clean;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${clean}${text}`;
}
