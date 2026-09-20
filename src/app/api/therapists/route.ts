import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { apiErrorResponse, FriendlyError } from "@/lib/api-error";
import { therapistSchema } from "@/lib/validation/therapist";
import { hashPassword } from "@/lib/auth/password";
import { recordAudit } from "@/lib/audit";

const DEFAULT_WORKING_HOURS = { startMinutes: 9 * 60, endMinutes: 18 * 60 }; // 9 AM - 6 PM, all days, editable after creation

export async function GET(req: NextRequest) {
  try {
    await requirePermission("therapists:read");
    const status = req.nextUrl.searchParams.get("status");
    const therapists = await prisma.therapist.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        user: { select: { name: true, email: true, phone: true, status: true } },
        services: { select: { serviceId: true } },
      },
      orderBy: { user: { name: "asc" } },
    });
    return NextResponse.json({ therapists });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("therapists:manage");
    const body = therapistSchema.parse(await req.json());

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new FriendlyError("A user with this email already exists.");
    if (!body.password) throw new FriendlyError("Set an initial password for this therapist's login.");

    const passwordHash = await hashPassword(body.password);

    const therapist = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: body.email, name: body.name, phone: body.phone, passwordHash, role: "THERAPIST" },
      });
      const created = await tx.therapist.create({
        data: {
          userId: user.id,
          photoUrl: body.photoUrl,
          emergencyContactName: body.emergencyContactName,
          emergencyContactPhone: body.emergencyContactPhone,
          employmentStatus: body.employmentStatus,
          hireDate: body.hireDate,
          bio: body.bio,
          areasServed: body.areasServed,
          maxTravelRadiusKm: body.maxTravelRadiusKm,
          homeLat: body.homeLat,
          homeLng: body.homeLng,
          active: body.active,
          services: { create: body.serviceIds.map((serviceId) => ({ serviceId })) },
          workingHours: {
            create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
              dayOfWeek,
              isActive: dayOfWeek !== 0, // default: closed Sundays, editable
              startMinutes: DEFAULT_WORKING_HOURS.startMinutes,
              endMinutes: DEFAULT_WORKING_HOURS.endMinutes,
            })),
          },
        },
      });
      return created;
    });

    await recordAudit({ userId: session.userId, action: "CREATE", entity: "Therapist", entityId: therapist.id, after: therapist, req });
    return NextResponse.json({ therapist }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
