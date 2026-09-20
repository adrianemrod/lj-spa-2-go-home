import "server-only";
import { requireSession } from "@/lib/auth/require-session";
import { can, type Permission } from "@/lib/auth/permissions";
import { AuthError } from "@/lib/auth/require-session";
import type { SessionPayload } from "@/lib/auth/session";

export async function requirePermission(permission: Permission): Promise<SessionPayload> {
  const session = await requireSession();
  if (!can(session.role, permission)) {
    throw new AuthError(`Missing permission: ${permission}`, 403);
  }
  return session;
}
