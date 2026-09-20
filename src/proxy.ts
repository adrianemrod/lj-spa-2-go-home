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
];

// Static files under public/ (logo, icons, fonts, …) are never behind the
// auth gate — they're requested directly by the browser on public pages
// (the login screen, the homepage, the PWA manifest) with no session
// cookie attached. Missed this for /brand/logo.png when the real logo was
// added: it 307'd to /login instead of rendering. Path-prefix allowlists
// (the old "/icons" entry) don't scale to every asset folder someone adds
// later, so this matches by extension instead — the same class of fix as
// the /api/services and /api/therapists/me/schedule gate bugs earlier.
const STATIC_ASSET_PATTERN = /\.(png|jpe?g|svg|ico|webp|gif|avif|woff2?|ttf|otf)$/i;

function forPagePrefix(prefix: string) {
  return (p: string) => p === prefix || p.startsWith(`${prefix}/`);
}

// Page-level role gates ONLY — redirect-away UX for a section a role
// shouldn't see. Deliberately does NOT cover /api/*: almost every API
// route mixes "staff with permission X" access with a resource owner's
// own self-service access (a therapist reading their own schedule, a
// client reading their own booking), which a single coarse prefix rule
// can't express without either blocking legitimate self-access or
// opening the route to every authenticated role. Getting that mapping
// wrong here previously 403'd a therapist calling their own
// /api/therapists/me/schedule and a dispatcher calling /api/services —
// both real bugs found by live testing, not typechecking.
//
// The actual security boundary is unchanged: every API route calls
// requireSession()/requirePermission() against the RBAC matrix in
// src/lib/auth/permissions.ts (or an explicit "isSelf" check) before
// touching Prisma. This gate is just page-routing UX on top of that.
const PAGE_ROLE_GATES: { test: (pathname: string) => boolean; roles: Role[] }[] = [
  { test: forPagePrefix("/dashboard"), roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "DISPATCHER", "ACCOUNTING"] },
  { test: forPagePrefix("/calendar"), roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "DISPATCHER", "ACCOUNTING"] },
  { test: forPagePrefix("/live-map"), roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "DISPATCHER", "ACCOUNTING"] },
  { test: forPagePrefix("/bookings"), roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "DISPATCHER", "ACCOUNTING"] },
  { test: forPagePrefix("/therapists"), roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "DISPATCHER", "ACCOUNTING"] },
  { test: forPagePrefix("/clients"), roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "DISPATCHER"] },
  { test: forPagePrefix("/services"), roles: ["SUPER_ADMIN", "OWNER", "MANAGER"] },
  { test: forPagePrefix("/sales"), roles: ["SUPER_ADMIN", "OWNER", "ACCOUNTING"] },
  { test: forPagePrefix("/expenses"), roles: ["SUPER_ADMIN", "OWNER", "ACCOUNTING"] },
  { test: forPagePrefix("/performance"), roles: ["SUPER_ADMIN", "OWNER", "MANAGER"] },
  { test: forPagePrefix("/reports"), roles: ["SUPER_ADMIN", "OWNER", "ACCOUNTING", "MANAGER"] },
  { test: forPagePrefix("/settings"), roles: ["SUPER_ADMIN", "OWNER"] },
  { test: forPagePrefix("/audit-log"), roles: ["SUPER_ADMIN", "OWNER"] },
  { test: forPagePrefix("/app"), roles: ["THERAPIST"] }, // therapist PWA
  { test: forPagePrefix("/my"), roles: ["CLIENT"] }, // client self-service
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
    STATIC_ASSET_PATTERN.test(pathname) ||
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

  // API authorization happens in the route handlers themselves — see the
  // comment on PAGE_ROLE_GATES above.
  if (isApi) return NextResponse.next();

  const gate = PAGE_ROLE_GATES.find((g) => g.test(pathname));
  if (gate && !gate.roles.includes(session.role)) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role], getAppUrl(req)));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|icons).*)"],
};
