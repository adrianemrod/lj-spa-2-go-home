import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateManila } from "@/lib/format";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePermission("clients:read");
  const { q } = await searchParams;

  const clients = await prisma.client.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { _count: { select: { bookings: true } }, addresses: { where: { isDefault: true }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-fg">Clients</h1>
          <p className="text-sm text-fg-muted">Booking history, favorites, and contact details.</p>
        </div>
        <Link href="/clients/new">
          <Button>
            <Plus size={16} /> New Client
          </Button>
        </Link>
      </div>

      <form className="mb-4" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, phone, or email…"
          className="h-10 w-full max-w-sm rounded-[var(--radius-sm)] border border-border bg-bg px-3 text-sm"
        />
      </form>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Phone</th>
              <th className="px-5 py-3 font-medium">Default Area</th>
              <th className="px-5 py-3 font-medium">Visits</th>
              <th className="px-5 py-3 font-medium">Client Since</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-fg/[0.02]">
                <td className="px-5 py-3">
                  <Link href={`/clients/${c.id}`} className="font-medium text-fg hover:text-accent">
                    {c.name}
                  </Link>
                </td>
                <td className="px-5 py-3 text-fg-muted">{c.phone}</td>
                <td className="px-5 py-3 text-fg-muted">{c.addresses[0]?.area ?? "—"}</td>
                <td className="px-5 py-3 text-fg-muted">{c._count.bookings}</td>
                <td className="px-5 py-3 text-fg-muted">{formatDateManila(c.createdAt)}</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-fg-muted">
                  No clients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
