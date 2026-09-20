"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  MapPin,
  Users,
  Contact,
  Sparkles,
  TrendingUp,
  Receipt,
  BarChart3,
  FileText,
  Settings,
  ShieldCheck,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/components/layout/nav-items";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  MapPin,
  Users,
  Contact,
  Sparkles,
  TrendingUp,
  Receipt,
  BarChart3,
  FileText,
  Settings,
  ShieldCheck,
  Bell,
};

export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <aside data-theme="ops" className="hidden w-60 shrink-0 flex-col border-r border-border bg-bg px-3 py-5 md:flex">
      <div className="mb-8 px-2">
        <Logo />
      </div>
      <nav className="flex flex-1 flex-col gap-0.5">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-accent/15 text-accent" : "text-fg-muted hover:bg-fg/5 hover:text-fg"
              )}
            >
              {Icon && <Icon size={17} strokeWidth={1.75} />}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
