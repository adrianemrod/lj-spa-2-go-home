import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { apiErrorResponse } from "@/lib/api-error";
import { expenseSchema } from "@/lib/validation/expense";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("expenses:read");
    const month = req.nextUrl.searchParams.get("month"); // YYYY-MM
    const where = month
      ? {
          date: {
            gte: new Date(`${month}-01T00:00:00`),
            lt: new Date(new Date(`${month}-01T00:00:00`).setMonth(new Date(`${month}-01T00:00:00`).getMonth() + 1)),
          },
        }
      : undefined;

    const expenses = await prisma.expense.findMany({
      where,
      include: { category: true, createdBy: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 300,
    });
    return NextResponse.json({ expenses });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("expenses:manage");
    const body = expenseSchema.parse(await req.json());
    const expense = await prisma.expense.create({
      data: { ...body, status: "APPROVED", createdById: session.userId },
    });
    await recordAudit({ userId: session.userId, action: "CREATE", entity: "Expense", entityId: expense.id, after: expense, req });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
