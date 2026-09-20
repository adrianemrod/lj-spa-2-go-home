import "server-only";

/**
 * In-memory fixed-window rate limiter. Deliberately simple: fine for a
 * single-instance deployment (the Railway-style deploy this app targets —
 * see README), but resets on restart and doesn't coordinate across
 * multiple instances. A multi-instance production deployment should swap
 * this for a shared store (Redis, Upstash) behind the same
 * checkRateLimit() signature — nothing else needs to change.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count++;
  return { ok: true, retryAfterMs: 0 };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() ?? "unknown";
}
