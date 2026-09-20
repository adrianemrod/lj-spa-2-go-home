import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { apiErrorResponse } from "@/lib/api-error";
import { serviceSchema } from "@/lib/validation/service";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("services:manage");
    const includeInactive = req.nextUrl.searchParams.get("all") === "1";
    const services = await prisma.service.findMany({
      where: includeInactive ? {} : { active: true },
      include: { category: true, therapists: { select: { therapistId: true } } },
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    });
    return NextResponse.json({ services });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("services:manage");
    const body = serviceSchema.parse(await req.json());

    const service = await prisma.service.create({
      data: {
        categoryId: body.categoryId ?? undefined,
        name: body.name,
        description: body.description,
        durationMinutes: body.durationMinutes,
        price: body.price,
        commissionType: body.commissionType,
        commissionValue: body.commissionValue,
        bufferMinutes: body.bufferMinutes,
        requiredSkillTags: body.requiredSkillTags,
        active: body.active,
        therapists: { create: body.therapistIds.map((therapistId) => ({ therapistId })) },
      },
    });

    await recordAudit({ userId: session.userId, action: "CREATE", entity: "Service", entityId: service.id, after: service, req });
    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
