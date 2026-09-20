import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { apiErrorResponse } from "@/lib/api-error";
import { getTherapistPerformance } from "@/lib/performance";

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** THERAPIST MONTHLY PERFORMANCE export (spec section 54). */
export async function GET(req: NextRequest) {
  try {
    await requirePermission("reports:read");
    const month = req.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
    const start = new Date(`${month}-01T00:00:00+08:00`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const rows = await getTherapistPerformance({ start, end });

    const header = ["Therapist", "Bookings", "Completed", "Revenue", "Service Hours", "Travel Hours", "Commission"];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [r.name, r.totalBookings, r.completed, r.revenue.toFixed(2), r.serviceHours, r.travelHours, r.commissionEarned.toFixed(2)]
          .map(csvEscape)
          .join(",")
      ),
    ];

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="therapist-performance-${month}.csv"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
