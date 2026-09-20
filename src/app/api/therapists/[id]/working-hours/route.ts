import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { apiErrorResponse } from "@/lib/api-error";
import { workingHoursSchema } from "@/lib/validation/therapist";
import { recordAudit } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

const replaceSchema = z.object({ days: z.array(workingHoursSchema).length(7) });

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("therapists:manage");
    const { id } = await params;
    const body = replaceSchema.parse(await req.json());

    await prisma.$transaction(
      body.days.map((day) =>
        prisma.therapistWorkingHours.upsert({
          where: { therapistId_dayOfWeek: { therapistId: id, dayOfWeek: day.dayOfWeek } },
          create: { therapistId: id, ...day },
          update: day,
        })
      )
    );

    await recordAudit({ userId: session.userId, action: "UPDATE", entity: "TherapistWorkingHours", entityId: id, after: body.days, req });
    const workingHours = await prisma.therapistWorkingHours.findMany({
      where: { therapistId: id },
      orderBy: { dayOfWeek: "asc" },
    });
    return NextResponse.json({ workingHours });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
