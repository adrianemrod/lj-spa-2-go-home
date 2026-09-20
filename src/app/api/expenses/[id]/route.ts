import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { apiErrorResponse } from "@/lib/api-error";
import { expenseSchema } from "@/lib/validation/expense";
import { recordAudit } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("expenses:manage");
    const { id } = await params;
    const before = await prisma.expense.findUniqueOrThrow({ where: { id } });
    const body = expenseSchema.parse(await req.json());
    const expense = await prisma.expense.update({ where: { id }, data: body });
    await recordAudit({ userId: session.userId, action: "UPDATE", entity: "Expense", entityId: id, before, after: expense, req });
    return NextResponse.json({ expense });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("expenses:manage");
    const { id } = await params;
    const expense = await prisma.expense.delete({ where: { id } });
    await recordAudit({ userId: session.userId, action: "DELETE", entity: "Expense", entityId: id, before: expense, req });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
