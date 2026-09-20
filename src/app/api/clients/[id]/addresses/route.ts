import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { can } from "@/lib/auth/permissions";
import { apiErrorResponse, FriendlyError } from "@/lib/api-error";
import { clientAddressSchema } from "@/lib/validation/client";

interface Params {
  params: Promise<{ id: string }>;
}

async function assertAccess(clientId: string) {
  const session = await requireSession();
  const isSelf = session.role === "CLIENT" && session.clientId === clientId;
  if (!isSelf && !can(session.role, "clients:manage")) {
    throw new FriendlyError("Not authorized to manage this client's addresses.");
  }
  return session;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await assertAccess(id);
    const body = clientAddressSchema.parse(await req.json());

    const address = await prisma.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.clientAddress.updateMany({ where: { clientId: id }, data: { isDefault: false } });
      }
      return tx.clientAddress.create({ data: { clientId: id, ...body } });
    });

    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
