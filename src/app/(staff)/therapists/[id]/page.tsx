import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TherapistStatusPill } from "@/components/ui/status-pill";
import { Badge } from "@/components/ui/badge";
import { WorkingHoursEditor } from "@/components/therapists/working-hours-editor";
import { DaysOffManager } from "@/components/therapists/days-off-manager";
import { formatCurrency, formatDateTimeManila } from "@/lib/format";

export default async function TherapistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("therapists:read");
  const { id } = await params;

  const therapist = await prisma.therapist.findUniqueOrThrow({
    where: { id },
    include: {
      user: true,
      services: { include: { service: true } },
      workingHours: { orderBy: { dayOfWeek: "asc" } },
      daysOff: { where: { date: { gte: new Date() } }, orderBy: { date: "asc" } },
      _count: { select: { bookings: true } },
    },
  });

  const [completedCount, revenueAgg, commissionAgg] = await Promise.all([
    prisma.booking.count({ where: { therapistId: id, status: "COMPLETED" } }),
    prisma.booking.aggregate({ where: { therapistId: id, status: "COMPLETED" }, _sum: { amount: true } }),
    prisma.commission.aggregate({ where: { therapistId: id }, _sum: { commissionAmount: true } }),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl text-fg">{therapist.user.name}</h1>
          <p className="text-sm text-fg-muted">
            {therapist.user.email} · {therapist.user.phone}
          </p>
        </div>
        <TherapistStatusPill status={therapist.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Total Bookings" value={String(therapist._count.bookings)} />
        <StatTile label="Completed" value={String(completedCount)} />
        <StatTile label="Revenue Generated" value={formatCurrency(revenueAgg._sum.amount?.toString() ?? "0")} />
        <StatTile label="Commission Earned" value={formatCurrency(commissionAgg._sum.commissionAmount?.toString() ?? "0")} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-fg-muted">Employment status</p>
            <p className="text-fg">{therapist.employmentStatus.replace("_", " ")}</p>
          </div>
          <div>
            <p className="text-fg-muted">Max travel radius</p>
            <p className="text-fg">{therapist.maxTravelRadiusKm.toString()} km</p>
          </div>
          <div>
            <p className="text-fg-muted">Base location</p>
            <p className="text-fg">
              {therapist.homeLat?.toString()}, {therapist.homeLng?.toString()}
            </p>
          </div>
          <div>
            <p className="text-fg-muted">Location last updated</p>
            <p className="text-fg">
              {therapist.locationUpdatedAt ? formatDateTimeManila(therapist.locationUpdatedAt) : "Never"}
            </p>
          </div>
          <div className="col-span-2">
            <p className="mb-1 text-fg-muted">Services</p>
            <div className="flex flex-wrap gap-1.5">
              {therapist.services.map((s) => (
                <Badge key={s.serviceId}>{s.service.name}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <WorkingHoursEditor
        therapistId={id}
        initial={therapist.workingHours.map((h) => ({
          dayOfWeek: h.dayOfWeek,
          isActive: h.isActive,
          startMinutes: h.startMinutes,
          endMinutes: h.endMinutes,
          breakStartMinutes: h.breakStartMinutes,
          breakEndMinutes: h.breakEndMinutes,
        }))}
      />

      <DaysOffManager
        therapistId={id}
        initial={therapist.daysOff.map((d) => ({ id: d.id, date: d.date.toISOString(), reason: d.reason }))}
      />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-fg-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-fg">{value}</p>
    </Card>
  );
}
