import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { apiErrorResponse } from "@/lib/api-error";
import { businessSettingsSchema, BUSINESS_SETTINGS_KEY, DEFAULT_BUSINESS_SETTINGS } from "@/lib/validation/settings";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requirePermission("settings:manage");
    const row = await prisma.setting.findUnique({ where: { key: BUSINESS_SETTINGS_KEY } });
    return NextResponse.json({ settings: row ? row.value : DEFAULT_BUSINESS_SETTINGS });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requirePermission("settings:manage");
    const before = await prisma.setting.findUnique({ where: { key: BUSINESS_SETTINGS_KEY } });
    const body = businessSettingsSchema.parse(await req.json());

    const row = await prisma.setting.upsert({
      where: { key: BUSINESS_SETTINGS_KEY },
      create: { key: BUSINESS_SETTINGS_KEY, value: body, updatedById: session.userId },
      update: { value: body, updatedById: session.userId },
    });

    await recordAudit({
      userId: session.userId,
      action: "UPDATE",
      entity: "Setting",
      entityId: BUSINESS_SETTINGS_KEY,
      before: before?.value,
      after: row.value,
      req,
    });

    return NextResponse.json({ settings: row.value });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
