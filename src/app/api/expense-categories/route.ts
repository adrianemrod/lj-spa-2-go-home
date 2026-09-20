import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    await requirePermission("expenses:read");
    const categories = await prisma.expenseCategory.findMany({ where: { active: true }, orderBy: { name: "asc" } });
    return NextResponse.json({ categories });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
