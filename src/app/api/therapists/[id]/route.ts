import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { requireSession } from "@/lib/auth/require-session";
import { apiErrorResponse } from "@/lib/api-error";
import { recordAudit } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    // A therapist may fetch their own profile; everyone else needs the permission.
    if (session.role !== "THERAPIST" || session.therapistId !== id) {
      await requirePermission("therapists:read");
    }
    const therapist = await prisma.therapist.findUniqueOrThrow({
      where: { id },
      include: {
        user: { select: { name: true, email: true, phone: true, status: true } },
        services: { include: { service: true } },
        workingHours: { orderBy: { dayOfWeek: "asc" } },
        daysOff: { orderBy: { date: "asc" }, where: { date: { gte: new Date() } } },
      },
    });
    return NextResponse.json({ therapist });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const updateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().min(7).optional(),
  photoUrl: z.string().trim().optional(),
  emergencyContactName: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
  employmentStatus: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED"]).optional(),
  bio: z.string().trim().optional(),
  areasServed: z.array(z.string()).optional(),
  maxTravelRadiusKm: z.coerce.number().min(1).max(100).optional(),
  homeLat: z.coerce.number().min(-90).max(90).optional(),
  homeLng: z.coerce.number().min(-180).max(180).optional(),
  active: z.boolean().optional(),
  serviceIds: z.array(z.string().uuid()).optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("therapists:manage");
    const { id } = await params;
    const body = updateSchema.parse(await req.json());
    const before = await prisma.therapist.findUniqueOrThrow({ where: { id } });

    const therapist = await prisma.$transaction(async (tx) => {
      if (body.name || body.phone) {
        await tx.user.update({
          where: { id: before.userId },
          data: { name: body.name, phone: body.phone },
        });
      }
      if (body.serviceIds) {
        await tx.therapistService.deleteMany({ where: { therapistId: id } });
      }
      return tx.therapist.update({
        where: { id },
        data: {
          photoUrl: body.photoUrl,
          emergencyContactName: body.emergencyContactName,
          emergencyContactPhone: body.emergencyContactPhone,
          employmentStatus: body.employmentStatus,
          bio: body.bio,
          areasServed: body.areasServed,
          maxTravelRadiusKm: body.maxTravelRadiusKm,
          homeLat: body.homeLat,
          homeLng: body.homeLng,
          active: body.active,
          ...(body.serviceIds
            ? { services: { create: body.serviceIds.map((serviceId) => ({ serviceId })) } }
            : {}),
        },
      });
    });

    await recordAudit({ userId: session.userId, action: "UPDATE", entity: "Therapist", entityId: id, before, after: therapist, req });
    return NextResponse.json({ therapist });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
