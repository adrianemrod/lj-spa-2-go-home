import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeManila } from "@/lib/format";

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ entity?: string }> }) {
  await requirePermission("audit:read");
  const { entity } = await searchParams;

  const logs = await prisma.auditLog.findMany({
    where: entity ? { entity } : undefined,
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const entities = await prisma.auditLog.findMany({ distinct: ["entity"], select: { entity: true } });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-fg">Audit Log</h1>
        <p className="text-sm text-fg-muted">Every sensitive action, who did it, and when.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <a href="/audit-log">
          <Badge tone={!entity ? "accent" : "neutral"}>All</Badge>
        </a>
        {entities.map((e) => (
          <a key={e.entity} href={`/audit-log?entity=${e.entity}`}>
            <Badge tone={entity === e.entity ? "accent" : "neutral"}>{e.entity}</Badge>
          </a>
        ))}
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              <th className="px-5 py-3 font-medium">When</th>
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-5 py-3 font-medium">Action</th>
              <th className="px-5 py-3 font-medium">Entity</th>
              <th className="px-5 py-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border last:border-0 hover:bg-fg/[0.02]">
                <td className="px-5 py-3 text-fg-muted">{formatDateTimeManila(log.createdAt)}</td>
                <td className="px-5 py-3 text-fg">{log.user ? `${log.user.name} (${log.user.role})` : "System"}</td>
                <td className="px-5 py-3 text-fg-muted">{log.action}</td>
                <td className="px-5 py-3 text-fg-muted">
                  {log.entity}
                  {log.entityId && <span className="text-xs"> · {log.entityId.slice(0, 8)}</span>}
                </td>
                <td className="px-5 py-3 text-fg-muted">{log.ipAddress ?? "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-fg-muted">
                  No audit entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
