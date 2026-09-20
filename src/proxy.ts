import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getAppUrl } from "@/lib/env";
import type { Role } from "@prisma/client";

const SESSION_COOKIE = "lj_session";

// Exact-match public paths (root marketing/booking home only — everything
// else under a public prefix is matched via PUBLIC_PREFIXES below).
const PUBLIC_EXACT = ["/", "/manifest.webmanifest", "/sw.js"];

const PUBLIC_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/api/auth",
  "/book", // public client booking portal
  "/api/public", // public booking API (services, availability, create booking)
  "/icons",
];

// Route matcher -> roles allowed. Unlisted authenticated paths are open to
// any logged-in role (e.g. /account, a shared booking detail page).
//
// This is a coarse, page-and-API-prefix-level gate for UX (redirect away
// from / 403 a section a role shouldn't see). It is NOT the security
// boundary — every API route re-checks with requirePermission()/
// requireRole() against the real RBAC matrix in src/lib/auth/permissions.ts
// before touching Prisma, so a mistake here can't leak data.
function forPrefixes(...prefixes: string[]) {
  return (p: string) => prefixes.some((prefix) => p === prefix || p.startsWith(`${prefix}/`) || p.startsWith(`/api${prefix}`));
}

const ROLE_GATES: { test: (pathname: string) => boolean; roles: Role[] }[] = [
  {
    test: forPrefixes("/dashboard", "/calendar", "/live-map", "/bookings"),
    roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "DISPATCHER", "ACCOUNTING"],
  },
  {
    test: forPrefixes("/therapists"),
    roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "DISPATCHER", "ACCOUNTING"],
  },
  { test: forPrefixes("/clients"), roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "DISPATCHER"] },
  { test: forPrefixes("/services"), roles: ["SUPER_ADMIN", "OWNER", "MANAGER"] },
  { test: forPrefixes("/sales"), roles: ["SUPER_ADMIN", "OWNER", "ACCOUNTING"] },
  { test: forPrefixes("/expenses"), roles: ["SUPER_ADMIN", "OWNER", "ACCOUNTING"] },
  { test: forPrefixes("/performance"), roles: ["SUPER_ADMIN", "OWNER", "MANAGER"] },
  { test: forPrefixes("/reports"), roles: ["SUPER_ADMIN", "OWNER", "ACCOUNTING", "MANAGER"] },
  { test: forPrefixes("/settings"), roles: ["SUPER_ADMIN", "OWNER"] },
  { test: forPrefixes("/audit-log"), roles: ["SUPER_ADMIN", "OWNER"] },
  { test: forPrefixes("/app"), roles: ["THERAPIST"] }, // therapist PWA
  { test: forPrefixes("/my"), roles: ["CLIENT"] }, // client self-service
];

const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: "/dashboard",
  OWNER: "/dashboard",
  MANAGER: "/dashboard",
  DISPATCHER: "/dashboard",
  ACCOUNTING: "/dashboard",
  THERAPIST: "/app",
  CLIENT: "/my",
};

function secretKey() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? "");
}

async function readSession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as { role?: Role };
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (isPublic) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSession(token);
  const isApi = pathname.startsWith("/api");

  if (!session?.role) {
    if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const loginUrl = new URL("/login", getAppUrl(req));
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const gate = ROLE_GATES.find((g) => g.test(pathname));
  if (gate && !gate.roles.includes(session.role)) {
    if (isApi) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL(ROLE_HOME[session.role], getAppUrl(req)));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|icons).*)"],
};
