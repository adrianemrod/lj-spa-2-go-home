"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { LiveBoard } from "@/components/dashboard/live-board";
import type { CommandCenterSummary } from "@/lib/dashboard/summary";

const POLL_INTERVAL_MS = 10_000;

/**
 * Polling-based "realtime" — not a Supabase Realtime/WebSocket push, but
 * genuinely re-fetches live data on an interval rather than faking motion.
 * Good enough for an operations board at this scale; swap for a push
 * channel if/when Supabase Realtime is configured (see README).
 */
export function LiveDashboard({ initial }: { initial: CommandCenterSummary }) {
  const [summary, setSummary] = useState(initial);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(async () => {
      setRefreshing(true);
      try {
        const res = await fetch("/api/dashboard/summary");
        if (res.ok) {
          setSummary(await res.json());
          setLastUpdated(new Date());
        }
      } finally {
        setRefreshing(false);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-fg">Command Center</h1>
        <span className="flex items-center gap-1.5 text-xs text-fg-muted">
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          Updated {lastUpdated.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>
      <KpiCards kpis={summary.kpis} />
      <LiveBoard board={summary.board} />
    </div>
  );
}
