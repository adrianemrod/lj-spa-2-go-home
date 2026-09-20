import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { apiErrorResponse } from "@/lib/api-error";
import { clientSchema, clientAddressSchema } from "@/lib/validation/client";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("clients:read");
    const q = req.nextUrl.searchParams.get("q")?.trim();
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
      include: {
        _count: { select: { bookings: true } },
        addresses: { where: { isDefault: true }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ clients });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const createSchema = clientSchema.extend({ address: clientAddressSchema.optional() });

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("clients:manage");
    const body = createSchema.parse(await req.json());

    const client = await prisma.client.create({
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email || undefined,
        notes: body.notes,
        marketingConsent: body.marketingConsent,
        addresses: body.address ? { create: { ...body.address, isDefault: true } } : undefined,
      },
      include: { addresses: true },
    });

    await recordAudit({ userId: session.userId, action: "CREATE", entity: "Client", entityId: client.id, after: client, req });
    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
