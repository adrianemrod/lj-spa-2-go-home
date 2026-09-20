import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { apiErrorResponse } from "@/lib/api-error";
import { recordAudit } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string; dayOffId: string }>;
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("therapists:manage");
    const { dayOffId } = await params;
    const dayOff = await prisma.therapistDayOff.delete({ where: { id: dayOffId } });
    await recordAudit({ userId: session.userId, action: "DELETE", entity: "TherapistDayOff", entityId: dayOffId, before: dayOff, req });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
