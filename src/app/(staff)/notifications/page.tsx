import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeManila } from "@/lib/format";

export default async function NotificationsPage() {
  const session = await requireSession();
  const notifications = await prisma.notification.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-fg">Notifications</h1>
      <div className="space-y-2">
        {notifications.map((n) => (
          <Card key={n.id} className="p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-medium text-fg">{n.title}</p>
              <Badge tone={n.status === "FAILED" ? "critical" : "neutral"}>{n.channel}</Badge>
            </div>
            <p className="text-sm text-fg-muted">{n.body}</p>
            <p className="mt-1 text-xs text-fg-muted">{formatDateTimeManila(n.createdAt)}</p>
          </Card>
        ))}
        {notifications.length === 0 && <p className="text-sm text-fg-muted">No notifications yet.</p>}
      </div>
    </div>
  );
}
