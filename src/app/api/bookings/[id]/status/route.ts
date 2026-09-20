import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { can } from "@/lib/auth/permissions";
import { apiErrorResponse, FriendlyError } from "@/lib/api-error";
import { transitionBooking } from "@/lib/booking/transition-booking";
import { InvalidBookingTransitionError } from "@/lib/booking/status-machine";

interface Params {
  params: Promise<{ id: string }>;
}

const bodySchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "ASSIGNED",
    "TRAVELING",
    "ARRIVED",
    "IN_SERVICE",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
  ]),
  note: z.string().trim().optional(),
  reason: z.string().trim().optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = bodySchema.parse(await req.json());

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id }, select: { therapistId: true } });

    const isOwnBooking = session.role === "THERAPIST" && booking.therapistId === session.therapistId;
    const isDispatcher = can(session.role, "bookings:update");
    if (!isOwnBooking && !isDispatcher) {
      throw new FriendlyError("Not authorized to change this booking's status.");
    }
    if (body.status === "CANCELLED" && !isDispatcher) {
      throw new FriendlyError("Only booking staff can cancel a booking.");
    }
    if (body.status === "CANCELLED" && !body.reason) {
      throw new FriendlyError("A cancellation reason is required.");
    }

    await transitionBooking({
      bookingId: id,
      toStatus: body.status,
      changedById: session.userId,
      note: body.note,
      cancelReason: body.reason,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InvalidBookingTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return apiErrorResponse(error);
  }
}
