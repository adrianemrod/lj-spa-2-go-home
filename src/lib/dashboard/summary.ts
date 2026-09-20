import "server-only";
import { prisma } from "@/lib/prisma";
import { BUSINESS_TIMEZONE } from "@/lib/format";
import { toZonedTime } from "date-fns-tz";

/** [start, end) of "today" in Asia/Manila, expressed as UTC instants for Prisma range queries. */
export function manilaTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const zoned = toZonedTime(now, BUSINESS_TIMEZONE);
  const startOfDayZoned = new Date(zoned);
  startOfDayZoned.setHours(0, 0, 0, 0);
  // Convert back: since toZonedTime gives a Date whose UTC fields mirror
  // the zoned wall-clock, we reconstruct the UTC instant for midnight
  // Manila by taking the offset between `zoned` and `now`.
  const offsetMs = zoned.getTime() - now.getTime();
  const start = new Date(startOfDayZoned.getTime() - offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export async function getCommandCenterSummary() {
  const { start, end } = manilaTodayRange();

  const [
    todaysBookings,
    completedToday,
    pendingToday,
    cancelledToday,
    noShowToday,
    therapists,
    todaysSalesAgg,
    todaysExpensesAgg,
  ] = await Promise.all([
    prisma.booking.count({ where: { scheduledStart: { gte: start, lt: end } } }),
    prisma.booking.count({ where: { scheduledStart: { gte: start, lt: end }, status: "COMPLETED" } }),
    prisma.booking.count({ where: { scheduledStart: { gte: start, lt: end }, status: { in: ["PENDING", "CONFIRMED"] } } }),
    prisma.booking.count({ where: { scheduledStart: { gte: start, lt: end }, status: "CANCELLED" } }),
    prisma.booking.count({ where: { scheduledStart: { gte: start, lt: end }, status: "NO_SHOW" } }),
    prisma.therapist.findMany({
      where: { active: true },
      include: {
        user: { select: { name: true } },
        bookings: {
          where: { scheduledStart: { gte: start, lt: end }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
          orderBy: { scheduledStart: "asc" },
          include: { client: { select: { name: true } }, service: { select: { name: true, durationMinutes: true } } },
        },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.booking.aggregate({
      where: { scheduledStart: { gte: start, lt: end }, status: "COMPLETED" },
      _sum: { amount: true, discount: true, tip: true },
    }),
    prisma.expense.aggregate({ where: { date: { gte: start, lt: end } }, _sum: { amount: true } }),
  ]);

  const todaysSales =
    Number(todaysSalesAgg._sum.amount ?? 0) - Number(todaysSalesAgg._sum.discount ?? 0) + Number(todaysSalesAgg._sum.tip ?? 0);
  const todaysExpenses = Number(todaysExpensesAgg._sum.amount ?? 0);

  const statusCounts = {
    AVAILABLE: 0,
    TRAVELING: 0,
    IN_SERVICE: 0,
    OFF_DUTY: 0,
    OTHER: 0,
  };
  for (const t of therapists) {
    if (t.status === "AVAILABLE") statusCounts.AVAILABLE++;
    else if (t.status === "TRAVELING" || t.status === "ARRIVED") statusCounts.TRAVELING++;
    else if (t.status === "IN_SERVICE") statusCounts.IN_SERVICE++;
    else if (t.status === "OFF_DUTY" || t.status === "OFFLINE") statusCounts.OFF_DUTY++;
    else statusCounts.OTHER++;
  }

  return {
    kpis: {
      todaysBookings,
      activeTherapists: therapists.filter((t) => t.status !== "OFFLINE" && t.status !== "OFF_DUTY").length,
      availableNow: statusCounts.AVAILABLE,
      traveling: statusCounts.TRAVELING,
      inService: statusCounts.IN_SERVICE,
      completedToday,
      pendingBookings: pendingToday,
      todaysSales,
      todaysExpenses,
      todaysNet: todaysSales - todaysExpenses,
      cancellations: cancelledToday,
      noShows: noShowToday,
    },
    board: therapists.map((t) => {
      const now = new Date();
      const current = t.bookings.find((b) => b.scheduledStart <= now && b.scheduledEnd > now);
      const next = t.bookings.find((b) => b.scheduledStart > now);
      return {
        therapistId: t.id,
        name: t.user.name,
        status: t.status,
        statusUpdatedAt: t.statusUpdatedAt,
        current: current
          ? {
              bookingId: current.id,
              clientName: current.client.name,
              serviceName: current.service.name,
              start: current.scheduledStart,
              end: current.scheduledEnd,
            }
          : null,
        next: next
          ? { bookingId: next.id, clientName: next.client.name, start: next.scheduledStart }
          : null,
      };
    }),
  };
}

export type CommandCenterSummary = Awaited<ReturnType<typeof getCommandCenterSummary>>;
