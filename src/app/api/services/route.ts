import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { requirePermission } from "@/lib/auth/require-permission";
import { can } from "@/lib/auth/permissions";
import { apiErrorResponse, FriendlyError } from "@/lib/api-error";
import { serviceSchema } from "@/lib/validation/service";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    // Anyone who can manage services, or who can create bookings and needs
    // the catalog to build one, may read the list. Only services:manage
    // sees inactive services (the `all=1` flag below).
    const session = await requireSession();
    if (!can(session.role, "services:manage") && !can(session.role, "bookings:create")) {
      throw new FriendlyError("Not authorized to view services.");
    }
    const includeInactive = req.nextUrl.searchParams.get("all") === "1" && can(session.role, "services:manage");
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
