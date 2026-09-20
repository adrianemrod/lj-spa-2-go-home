import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { apiErrorResponse, FriendlyError } from "@/lib/api-error";
import { dayOffSchema } from "@/lib/validation/therapist";
import { recordAudit } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requirePermission("therapists:read");
    const { id } = await params;
    const daysOff = await prisma.therapistDayOff.findMany({
      where: { therapistId: id },
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ daysOff });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("therapists:manage");
    const { id } = await params;
    const body = dayOffSchema.parse(await req.json());

    const conflicting = await prisma.booking.count({
      where: {
        therapistId: id,
        date: body.date,
        status: { in: ["PENDING", "CONFIRMED", "ASSIGNED", "TRAVELING", "ARRIVED", "IN_SERVICE"] },
      },
    });
    if (conflicting > 0) {
      throw new FriendlyError(
        `This therapist has ${conflicting} active booking(s) on that date — reassign or cancel them before marking a day off.`
      );
    }

    const dayOff = await prisma.therapistDayOff.create({ data: { therapistId: id, ...body } });
    await recordAudit({ userId: session.userId, action: "CREATE", entity: "TherapistDayOff", entityId: dayOff.id, after: dayOff, req });
    return NextResponse.json({ dayOff }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
