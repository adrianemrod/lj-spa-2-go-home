import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";
import { recordAudit } from "@/lib/audit";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

const LOGIN_ATTEMPT_LIMIT = 10;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`login:${clientIp(req)}`, LOGIN_ATTEMPT_LIMIT, LOGIN_WINDOW_MS);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again in a few minutes." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { therapist: true, client: true },
  });

  // Same generic message whether the email doesn't exist or the password is
  // wrong — never reveal which one to an unauthenticated caller.
  const genericError = NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });

  if (!user || user.status !== "ACTIVE") return genericError;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return genericError;

  await createSession({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    therapistId: user.therapist?.id,
    clientId: user.client?.id,
  });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordAudit({
    userId: user.id,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
    req,
  });

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
