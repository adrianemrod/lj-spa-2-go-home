import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { recordAudit } from "@/lib/audit";
import { apiErrorResponse, FriendlyError } from "@/lib/api-error";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

const bodySchema = z.object({ token: z.string().min(1), password: z.string().min(8) });

export async function POST(req: NextRequest) {
  try {
    const rateLimit = checkRateLimit(`reset-password:${clientIp(req)}`, 10, 15 * 60 * 1000);
    if (!rateLimit.ok) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const { token, password } = bodySchema.parse(await req.json());
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new FriendlyError("This reset link is invalid or has expired. Please request a new one.");
    }

    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    ]);

    await recordAudit({ userId: resetToken.userId, action: "PASSWORD_RESET", entity: "User", entityId: resetToken.userId, req });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
