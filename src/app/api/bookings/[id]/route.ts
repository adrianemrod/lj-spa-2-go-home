import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { requirePermission } from "@/lib/auth/require-permission";
import { apiErrorResponse, FriendlyError } from "@/lib/api-error";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id },
      include: {
        client: true,
        therapist: { include: { user: { select: { name: true, phone: true } } } },
        service: true,
        statusEvents: { orderBy: { createdAt: "asc" }, include: { changedBy: { select: { name: true } } } },
        payments: true,
        bookingNotes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      },
    });

    if (session.role === "THERAPIST" && booking.therapistId !== session.therapistId) {
      throw new FriendlyError("Not authorized to view this booking.");
    }
    if (session.role === "CLIENT" && booking.clientId !== session.clientId) {
      throw new FriendlyError("Not authorized to view this booking.");
    }
    if (session.role !== "THERAPIST" && session.role !== "CLIENT") {
      await requirePermission("bookings:read:all");
    }

    return NextResponse.json({ booking });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
