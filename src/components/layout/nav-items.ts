import type { Permission } from "@/lib/auth/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: string; // lucide-react icon name, resolved in sidebar.tsx
  permission?: Permission;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Command Center", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Bookings", href: "/bookings", icon: "CalendarCheck", permission: "bookings:read:all" },
  { label: "Calendar", href: "/calendar", icon: "CalendarDays", permission: "bookings:read:all" },
  { label: "Live Map", href: "/live-map", icon: "MapPin", permission: "therapists:gps:read" },
  { label: "Therapists", href: "/therapists", icon: "Users", permission: "therapists:read" },
  { label: "Clients", href: "/clients", icon: "Contact", permission: "clients:read" },
  { label: "Services", href: "/services", icon: "Sparkles", permission: "services:manage" },
  { label: "Sales", href: "/sales", icon: "TrendingUp", permission: "sales:read" },
  { label: "Expenses", href: "/expenses", icon: "Receipt", permission: "expenses:read" },
  { label: "Performance", href: "/performance", icon: "BarChart3", permission: "performance:read" },
  { label: "Reports", href: "/reports", icon: "FileText", permission: "reports:read" },
  { label: "Notifications", href: "/notifications", icon: "Bell" },
  { label: "Settings", href: "/settings", icon: "Settings", permission: "settings:manage" },
  { label: "Audit Log", href: "/audit-log", icon: "ShieldCheck", permission: "audit:read" },
];

export function navItemsForRole(can: (p: Permission) => boolean): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.permission || can(item.permission));
}
