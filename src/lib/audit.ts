import "server-only";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

interface RecordAuditInput {
  userId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  req?: NextRequest;
}

/**
 * Every sensitive action (booking changes, price changes, expense edits,
 * payments, refunds, role changes, user create/disable) goes through this
 * so the audit log is real, not decorative. Failures here must never block
 * the action they're logging — an audit-write outage shouldn't take down
 * bookings — so callers fire-and-forget and errors are swallowed to console.
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? undefined,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? undefined,
        before: input.before === undefined ? undefined : (input.before as object),
        after: input.after === undefined ? undefined : (input.after as object),
        ipAddress: input.req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
        userAgent: input.req?.headers.get("user-agent") ?? undefined,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log", err);
  }
}
