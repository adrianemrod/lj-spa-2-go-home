import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AuthError } from "@/lib/auth/require-session";

/**
 * Central error -> friendly-response mapper for API routes (spec section
 * 50: never show a raw database error to a user). Route handlers wrap
 * their body in try/catch and call this once in the catch block.
 */
export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Invalid input.", issues: error.issues },
      { status: 400 }
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : "field";
      return NextResponse.json({ error: `A record with this ${target} already exists.` }, { status: 409 });
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "The record you're looking for doesn't exist." }, { status: 404 });
    }
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "This action can't be completed because other records still reference it." },
        { status: 409 }
      );
    }
  }
  if (error instanceof Error && (error as { friendly?: boolean }).friendly) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

/** Throw to produce a specific, user-safe 400 message from business logic. */
export class FriendlyError extends Error {
  friendly = true;
}
