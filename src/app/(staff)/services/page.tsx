import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, minutesToDurationLabel } from "@/lib/format";

export default async function ServicesPage() {
  await requirePermission("services:manage");
  const services = await prisma.service.findMany({
    include: { category: true, therapists: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-fg">Services</h1>
          <p className="text-sm text-fg-muted">Massage types, duration, pricing, and commission rules.</p>
        </div>
        <Link href="/services/new">
          <Button>
            <Plus size={16} /> New Service
          </Button>
        </Link>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              <th className="px-5 py-3 font-medium">Service</th>
              <th className="px-5 py-3 font-medium">Duration</th>
              <th className="px-5 py-3 font-medium">Price</th>
              <th className="px-5 py-3 font-medium">Commission</th>
              <th className="px-5 py-3 font-medium">Therapists</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-fg/[0.02]">
                <td className="px-5 py-3">
                  <Link href={`/services/${s.id}/edit`} className="font-medium text-fg hover:text-accent">
                    {s.name}
                  </Link>
                  {s.category && <p className="text-xs text-fg-muted">{s.category.name}</p>}
                </td>
                <td className="px-5 py-3 text-fg-muted">{minutesToDurationLabel(s.durationMinutes)}</td>
                <td className="px-5 py-3 text-fg-muted">{formatCurrency(s.price.toString())}</td>
                <td className="px-5 py-3 text-fg-muted">
                  {s.commissionType === "PERCENTAGE" ? `${s.commissionValue}%` : formatCurrency(s.commissionValue.toString())}
                </td>
                <td className="px-5 py-3 text-fg-muted">{s.therapists.length}</td>
                <td className="px-5 py-3">
                  <Badge tone={s.active ? "success" : "neutral"}>{s.active ? "Active" : "Inactive"}</Badge>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-fg-muted">
                  No services yet. Create your first massage service to start taking bookings.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
