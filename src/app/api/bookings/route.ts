import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { requirePermission } from "@/lib/auth/require-permission";
import { apiErrorResponse } from "@/lib/api-error";
import { createBookingSchema } from "@/lib/validation/booking";
import { createBooking } from "@/lib/booking/create-booking";
import type { BookingStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();

    const date = req.nextUrl.searchParams.get("date");
    const status = req.nextUrl.searchParams.get("status") as BookingStatus | null;
    const therapistId = req.nextUrl.searchParams.get("therapistId");

    const where: Prisma.BookingWhereInput = {};

    if (session.role === "THERAPIST") {
      where.therapistId = session.therapistId;
    } else if (session.role === "CLIENT") {
      where.clientId = session.clientId;
    } else {
      await requirePermission("bookings:read:all");
      if (therapistId) where.therapistId = therapistId;
    }

    if (date) where.date = new Date(date);
    if (status) where.status = status;

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        client: { select: { name: true, phone: true } },
        therapist: { include: { user: { select: { name: true } } } },
        service: { select: { name: true, durationMinutes: true } },
      },
      orderBy: { scheduledStart: "asc" },
      take: 200,
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("bookings:create");
    const body = createBookingSchema.parse(await req.json());
    const booking = await createBooking(body, session.userId);
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
