import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { notify } from "@/lib/notifications";
import { getAppUrl } from "@/lib/env";
import { apiErrorResponse } from "@/lib/api-error";

const bodySchema = z.object({ email: z.string().trim().toLowerCase().email() });
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  try {
    const rateLimit = checkRateLimit(`forgot-password:${clientIp(req)}`, 5, 15 * 60 * 1000);
    if (!rateLimit.ok) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { email } = bodySchema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email } });

    // Always the same response whether or not the email exists — never let
    // this endpoint be used to enumerate registered accounts.
    const genericResponse = NextResponse.json({
      message: "If that email is registered, a reset link has been sent.",
    });

    if (!user || user.status !== "ACTIVE") return genericResponse;

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    });

    const resetUrl = `${getAppUrl(req)}/reset-password/${token}`;
    await notify({
      userId: user.id,
      channel: "EMAIL",
      type: "PASSWORD_RESET",
      title: "Reset your password",
      body: `Reset your L&J Spa 2 Go Home password: ${resetUrl} (expires in 1 hour)`,
      to: user.email,
    });

    return genericResponse;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
