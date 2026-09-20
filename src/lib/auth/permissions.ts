import type { Role } from "@prisma/client";

/**
 * Central RBAC permission matrix. This is the single source of truth for
 * "can role X do Y" — UI uses it to hide/show controls, but every API route
 * re-checks it server-side via requirePermission(). Hiding a button is a
 * UX nicety here, never the actual guard.
 */
export type Permission =
  | "bookings:read:all"
  | "bookings:read:own"
  | "bookings:create"
  | "bookings:update"
  | "bookings:assign"
  | "bookings:cancel"
  | "clients:read"
  | "clients:manage"
  | "therapists:read"
  | "therapists:manage"
  | "therapists:gps:read"
  | "services:manage"
  | "sales:read"
  | "expenses:read"
  | "expenses:manage"
  | "commissions:read"
  | "commissions:manage"
  | "performance:read"
  | "reports:read"
  | "settings:manage"
  | "audit:read"
  | "users:manage"
  | "notifications:manage"
  | "waitlist:manage";

const MATRIX: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "bookings:read:all",
    "bookings:create",
    "bookings:update",
    "bookings:assign",
    "bookings:cancel",
    "clients:read",
    "clients:manage",
    "therapists:read",
    "therapists:manage",
    "therapists:gps:read",
    "services:manage",
    "sales:read",
    "expenses:read",
    "expenses:manage",
    "commissions:read",
    "commissions:manage",
    "performance:read",
    "reports:read",
    "settings:manage",
    "audit:read",
    "users:manage",
    "notifications:manage",
    "waitlist:manage",
  ],
  OWNER: [
    "bookings:read:all",
    "bookings:create",
    "bookings:update",
    "bookings:assign",
    "bookings:cancel",
    "clients:read",
    "clients:manage",
    "therapists:read",
    "therapists:manage",
    "therapists:gps:read",
    "services:manage",
    "sales:read",
    "expenses:read",
    "expenses:manage",
    "commissions:read",
    "commissions:manage",
    "performance:read",
    "reports:read",
    "settings:manage",
    "audit:read",
    "users:manage",
    "notifications:manage",
    "waitlist:manage",
  ],
  MANAGER: [
    "bookings:read:all",
    "bookings:create",
    "bookings:update",
    "bookings:assign",
    "bookings:cancel",
    "clients:read",
    "clients:manage",
    "therapists:read",
    "therapists:manage",
    "therapists:gps:read",
    "services:manage",
    "performance:read",
    "reports:read",
    "notifications:manage",
    "waitlist:manage",
  ],
  DISPATCHER: [
    "bookings:read:all",
    "bookings:create",
    "bookings:update",
    "bookings:assign",
    "bookings:cancel",
    "clients:read",
    "clients:manage",
    "therapists:read",
    "therapists:gps:read",
    "waitlist:manage",
  ],
  THERAPIST: ["bookings:read:own"],
  ACCOUNTING: [
    "bookings:read:all",
    "clients:read",
    "therapists:read",
    "sales:read",
    "expenses:read",
    "expenses:manage",
    "commissions:read",
    "commissions:manage",
    "reports:read",
  ],
  CLIENT: [],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false;
}

export function permissionsFor(role: Role): Permission[] {
  return MATRIX[role] ?? [];
}
