import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TherapistStatusPill } from "@/components/ui/status-pill";
import { Badge } from "@/components/ui/badge";

export default async function TherapistsPage() {
  await requirePermission("therapists:read");
  const therapists = await prisma.therapist.findMany({
    include: {
      user: { select: { name: true, email: true, phone: true } },
      services: { include: { service: { select: { name: true } } } },
      _count: { select: { bookings: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-fg">Therapists</h1>
          <p className="text-sm text-fg-muted">Profiles, working hours, service capability, and live status.</p>
        </div>
        <Link href="/therapists/new">
          <Button>
            <Plus size={16} /> New Therapist
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {therapists.map((t) => (
          <Link key={t.id} href={`/therapists/${t.id}`}>
            <Card className="h-full p-5 transition-shadow hover:shadow-md">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="font-medium text-fg">{t.user.name}</p>
                  <p className="text-xs text-fg-muted">{t.user.phone}</p>
                </div>
                <TherapistStatusPill status={t.status} />
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {t.services.slice(0, 3).map((s) => (
                  <Badge key={s.serviceId}>{s.service.name}</Badge>
                ))}
                {t.services.length > 3 && <Badge>+{t.services.length - 3}</Badge>}
              </div>
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span>{t._count.bookings} bookings total</span>
                {!t.active && <Badge tone="critical">Inactive</Badge>}
              </div>
            </Card>
          </Link>
        ))}
        {therapists.length === 0 && (
          <p className="col-span-full py-10 text-center text-fg-muted">
            No therapists yet. Add your first therapist to start scheduling.
          </p>
        )}
      </div>
    </div>
  );
}
