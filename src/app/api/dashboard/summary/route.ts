import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { apiErrorResponse } from "@/lib/api-error";
import { getCommandCenterSummary } from "@/lib/dashboard/summary";

export async function GET() {
  try {
    await requirePermission("bookings:read:all");
    const summary = await getCommandCenterSummary();
    return NextResponse.json(summary);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
