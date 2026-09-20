import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { apiErrorResponse, FriendlyError } from "@/lib/api-error";
import { serviceSchema } from "@/lib/validation/service";
import { recordAudit } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requirePermission("services:manage");
    const { id } = await params;
    const service = await prisma.service.findUniqueOrThrow({
      where: { id },
      include: { category: true, therapists: true, addOns: true },
    });
    return NextResponse.json({ service });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("services:manage");
    const { id } = await params;
    const before = await prisma.service.findUniqueOrThrow({ where: { id } });
    const body = serviceSchema.parse(await req.json());

    const service = await prisma.$transaction(async (tx) => {
      await tx.therapistService.deleteMany({ where: { serviceId: id } });
      return tx.service.update({
        where: { id },
        data: {
          categoryId: body.categoryId ?? null,
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
    });

    await recordAudit({ userId: session.userId, action: "UPDATE", entity: "Service", entityId: id, before, after: service, req });
    return NextResponse.json({ service });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("services:manage");
    const { id } = await params;
    const bookingCount = await prisma.booking.count({ where: { serviceId: id } });
    if (bookingCount > 0) {
      throw new FriendlyError(
        "This service has booking history and can't be deleted. Mark it inactive instead."
      );
    }
    const service = await prisma.service.delete({ where: { id } });
    await recordAudit({ userId: session.userId, action: "DELETE", entity: "Service", entityId: id, before: service, req });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
