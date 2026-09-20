import "server-only";
import { prisma } from "@/lib/prisma";
import { FriendlyError } from "@/lib/api-error";

const SYSTEM_USER_EMAIL = "system@ljspa2go.ph";

/**
 * The "created by" attribution for bookings that originate from the public
 * booking portal (no staff account involved). Seeded once by prisma/seed.ts;
 * this just looks it up rather than silently creating one, so a missing
 * system user is a loud deployment problem, not a mystery account.
 */
export async function getSystemUserId(): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email: SYSTEM_USER_EMAIL }, select: { id: true } });
  if (!user) {
    throw new FriendlyError("Online booking is temporarily unavailable. Please call us to book.");
  }
  return user.id;
}

export { SYSTEM_USER_EMAIL };
