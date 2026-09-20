import { requirePermission } from "@/lib/auth/require-permission";
import { getCommandCenterSummary } from "@/lib/dashboard/summary";
import { LiveDashboard } from "@/components/dashboard/live-dashboard";

export default async function DashboardPage() {
  await requirePermission("bookings:read:all");
  const summary = await getCommandCenterSummary();
  return <LiveDashboard initial={summary} />;
}
