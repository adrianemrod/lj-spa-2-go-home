import { describe, expect, it } from "vitest";
import { can, permissionsFor } from "@/lib/auth/permissions";

describe("RBAC permission matrix (spec sections 5 & 32)", () => {
  it("CLIENT has no staff permissions at all", () => {
    expect(permissionsFor("CLIENT")).toEqual([]);
  });

  it("THERAPIST can only read their own bookings, nothing else", () => {
    expect(permissionsFor("THERAPIST")).toEqual(["bookings:read:own"]);
    expect(can("THERAPIST", "bookings:read:all")).toBe(false);
    expect(can("THERAPIST", "therapists:gps:read")).toBe(false);
    expect(can("THERAPIST", "clients:manage")).toBe(false);
  });

  it("DISPATCHER can create and assign bookings but cannot see financial data", () => {
    expect(can("DISPATCHER", "bookings:create")).toBe(true);
    expect(can("DISPATCHER", "bookings:assign")).toBe(true);
    expect(can("DISPATCHER", "sales:read")).toBe(false);
    expect(can("DISPATCHER", "expenses:read")).toBe(false);
    expect(can("DISPATCHER", "settings:manage")).toBe(false);
  });

  it("ACCOUNTING sees financial data but not therapist GPS (spec section 6)", () => {
    expect(can("ACCOUNTING", "sales:read")).toBe(true);
    expect(can("ACCOUNTING", "expenses:manage")).toBe(true);
    expect(can("ACCOUNTING", "commissions:manage")).toBe(true);
    expect(can("ACCOUNTING", "therapists:gps:read")).toBe(false);
  });

  it("MANAGER cannot manage users or audit log (owner/super-admin only)", () => {
    expect(can("MANAGER", "users:manage")).toBe(false);
    expect(can("MANAGER", "audit:read")).toBe(false);
    expect(can("MANAGER", "bookings:read:all")).toBe(true);
  });

  it("only SUPER_ADMIN and OWNER can manage users and read the audit log", () => {
    for (const role of ["SUPER_ADMIN", "OWNER"] as const) {
      expect(can(role, "users:manage")).toBe(true);
      expect(can(role, "audit:read")).toBe(true);
    }
    for (const role of ["MANAGER", "DISPATCHER", "ACCOUNTING", "THERAPIST", "CLIENT"] as const) {
      expect(can(role, "users:manage")).toBe(false);
    }
  });
});
