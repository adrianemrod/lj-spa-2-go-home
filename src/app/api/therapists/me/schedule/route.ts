import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { apiErrorResponse, FriendlyError } from "@/lib/api-error";
import { manilaTodayRange } from "@/lib/dashboard/summary";

/** Today's schedule for the logged-in therapist — the PWA home screen's data source. */
export async function GET() {
  try {
    const session = await requireSession();
    if (session.role !== "THERAPIST" || !session.therapistId) {
      throw new FriendlyError("Only therapists have a schedule here.");
    }
    const { start, end } = manilaTodayRange();

    const [therapist, bookings, completedCount, todaysCommissionAgg] = await Promise.all([
      prisma.therapist.findUniqueOrThrow({
        where: { id: session.therapistId },
        include: { user: { select: { name: true } } },
      }),
      prisma.booking.findMany({
        where: { therapistId: session.therapistId, scheduledStart: { gte: start, lt: end }, status: { not: "CANCELLED" } },
        orderBy: { scheduledStart: "asc" },
        include: { client: { select: { name: true, phone: true } }, service: { select: { name: true, durationMinutes: true } } },
      }),
      prisma.booking.count({ where: { therapistId: session.therapistId, status: "COMPLETED" } }),
      prisma.commission.aggregate({
        where: { therapistId: session.therapistId, createdAt: { gte: start, lt: end } },
        _sum: { commissionAmount: true },
      }),
    ]);

    return NextResponse.json({
      therapist: { id: therapist.id, name: therapist.user.name, status: therapist.status },
      bookings,
      completedCount,
      todaysEarnings: Number(todaysCommissionAgg._sum.commissionAmount ?? 0),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
