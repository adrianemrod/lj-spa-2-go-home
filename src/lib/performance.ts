import "server-only";
import { prisma } from "@/lib/prisma";

export interface TherapistPerformanceRow {
  therapistId: string;
  name: string;
  totalBookings: number;
  completed: number;
  cancelled: number;
  noShow: number;
  revenue: number;
  avgBookingValue: number;
  serviceHours: number;
  travelHours: number;
  utilizationPct: number;
  commissionEarned: number;
  repeatClients: number;
  newClients: number;
}

/**
 * Per-therapist metrics for the owner to compare — deliberately NOT
 * reduced to one opaque score (spec section 23). The page sorts by
 * whichever column the owner picks.
 */
export async function getTherapistPerformance(range?: { start: Date; end: Date }): Promise<TherapistPerformanceRow[]> {
  const dateFilter = range ? { scheduledStart: { gte: range.start, lt: range.end } } : {};

  const therapists = await prisma.therapist.findMany({
    where: { active: true },
    include: { user: { select: { name: true } } },
  });

  return Promise.all(
    therapists.map(async (t): Promise<TherapistPerformanceRow> => {
      const bookings = await prisma.booking.findMany({
        where: { therapistId: t.id, ...dateFilter },
        select: { status: true, amount: true, discount: true, clientId: true, scheduledStart: true, scheduledEnd: true, travelMinutes: true },
      });

      const completed = bookings.filter((b) => b.status === "COMPLETED");
      const cancelled = bookings.filter((b) => b.status === "CANCELLED");
      const noShow = bookings.filter((b) => b.status === "NO_SHOW");
      const revenue = completed.reduce((sum, b) => sum + Number(b.amount) - Number(b.discount), 0);
      const serviceHours =
        completed.reduce((sum, b) => sum + (b.scheduledEnd.getTime() - b.scheduledStart.getTime()) / 3_600_000, 0);
      const travelHours = completed.reduce((sum, b) => sum + (b.travelMinutes ?? 0) / 60, 0);

      const clientCounts = new Map<string, number>();
      for (const b of completed) clientCounts.set(b.clientId, (clientCounts.get(b.clientId) ?? 0) + 1);
      const repeatClients = [...clientCounts.values()].filter((c) => c > 1).length;
      const newClients = [...clientCounts.values()].filter((c) => c === 1).length;

      const commissionAgg = await prisma.commission.aggregate({
        where: { therapistId: t.id, ...(range ? { createdAt: { gte: range.start, lt: range.end } } : {}) },
        _sum: { commissionAmount: true },
      });

      return {
        therapistId: t.id,
        name: t.user.name,
        totalBookings: bookings.length,
        completed: completed.length,
        cancelled: cancelled.length,
        noShow: noShow.length,
        revenue,
        avgBookingValue: completed.length > 0 ? revenue / completed.length : 0,
        serviceHours: Math.round(serviceHours * 10) / 10,
        travelHours: Math.round(travelHours * 10) / 10,
        utilizationPct: serviceHours + travelHours > 0 ? Math.round((serviceHours / (serviceHours + travelHours)) * 100) : 0,
        commissionEarned: Number(commissionAgg._sum.commissionAmount ?? 0),
        repeatClients,
        newClients,
      };
    })
  );
}
