import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { manilaTodayRange } from "@/lib/dashboard/summary";
import { TherapistHome } from "@/components/therapist-app/therapist-home";

export default async function TherapistAppPage() {
  const session = await requireSession();
  const { start, end } = manilaTodayRange();

  const [therapist, bookings, completedCount, todaysCommissionAgg] = await Promise.all([
    prisma.therapist.findUniqueOrThrow({
      where: { id: session.therapistId! },
      include: { user: { select: { name: true } } },
    }),
    prisma.booking.findMany({
      where: { therapistId: session.therapistId!, scheduledStart: { gte: start, lt: end }, status: { not: "CANCELLED" } },
      orderBy: { scheduledStart: "asc" },
      include: { client: { select: { name: true, phone: true } }, service: { select: { name: true, durationMinutes: true } } },
    }),
    prisma.booking.count({ where: { therapistId: session.therapistId!, status: "COMPLETED" } }),
    prisma.commission.aggregate({
      where: { therapistId: session.therapistId!, createdAt: { gte: start, lt: end } },
      _sum: { commissionAmount: true },
    }),
  ]);

  return (
    <TherapistHome
      initial={{
        therapist: { id: therapist.id, name: therapist.user.name, status: therapist.status },
        bookings: JSON.parse(JSON.stringify(bookings)),
        completedCount,
        todaysEarnings: Number(todaysCommissionAgg._sum.commissionAmount ?? 0),
      }}
    />
  );
}
