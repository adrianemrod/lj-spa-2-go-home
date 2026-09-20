import type { NextRequest } from "next/server";

/**
 * The app's public-facing URL, for building absolute links (invite links,
 * password reset links, booking confirmations) that get sent outside the
 * current request. Behind a reverse proxy the request's own origin can
 * resolve to an internal address, so an explicitly configured APP_URL wins.
 */
export function getAppUrl(req?: NextRequest): string {
  const configured = process.env.APP_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (req) return req.nextUrl.origin;
  return "http://localhost:3000";
}
