import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { requirePermission } from "@/lib/auth/require-permission";
import { can } from "@/lib/auth/permissions";
import { apiErrorResponse, FriendlyError } from "@/lib/api-error";
import { clientSchema } from "@/lib/validation/client";
import { recordAudit } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (session.role !== "CLIENT" || session.clientId !== id) {
      await requirePermission("clients:read");
    }
    const client = await prisma.client.findUniqueOrThrow({
      where: { id },
      include: {
        addresses: { orderBy: { isDefault: "desc" } },
        bookings: {
          orderBy: { scheduledStart: "desc" },
          take: 20,
          include: { service: true, therapist: { include: { user: { select: { name: true } } } } },
        },
        _count: { select: { bookings: true } },
      },
    });

    const canSeeFinancials = session.role === "CLIENT" || can(session.role, "sales:read");
    if (canSeeFinancials) {
      return NextResponse.json({ client });
    }

    // Booking staff without financial permission see the booking list, minus amounts.
    return NextResponse.json({
      client: {
        ...client,
        bookings: client.bookings.map((b) => ({ ...b, amount: undefined, discount: undefined, tip: undefined })),
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const updateSchema = clientSchema.partial();

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("clients:manage");
    const { id } = await params;
    const before = await prisma.client.findUniqueOrThrow({ where: { id } });
    const body = updateSchema.parse(await req.json());

    const client = await prisma.client.update({
      where: { id },
      data: { ...body, email: body.email || undefined },
    });

    await recordAudit({ userId: session.userId, action: "UPDATE", entity: "Client", entityId: id, before, after: client, req });
    return NextResponse.json({ client });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("clients:manage");
    const { id } = await params;
    const bookingCount = await prisma.booking.count({ where: { clientId: id } });
    if (bookingCount > 0) {
      throw new FriendlyError("This client has booking history and can't be deleted.");
    }
    const client = await prisma.client.delete({ where: { id } });
    await recordAudit({ userId: session.userId, action: "DELETE", entity: "Client", entityId: id, before: client, req });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
