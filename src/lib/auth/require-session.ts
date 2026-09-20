import "server-only";
import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/auth/session";
import type { Role } from "@prisma/client";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/**
 * Server-side gate for API route handlers. Never trust a hidden button —
 * every mutating or sensitive-read route calls this (or requireRole) before
 * touching Prisma.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Not authenticated", 401);
  }
  return session;
}

export async function requireRole(...roles: Role[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!roles.includes(session.role)) {
    throw new AuthError("Not authorized for this action", 403);
  }
  return session;
}

export function authErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}
