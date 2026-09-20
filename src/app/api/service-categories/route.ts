import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    await requirePermission("services:manage");
    const categories = await prisma.serviceCategory.findMany({ orderBy: { sortOrder: "asc" } });
    return NextResponse.json({ categories });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const createSchema = z.object({ name: z.string().trim().min(2), sortOrder: z.coerce.number().int().default(0) });

export async function POST(req: NextRequest) {
  try {
    await requirePermission("services:manage");
    const body = createSchema.parse(await req.json());
    const category = await prisma.serviceCategory.create({ data: body });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
