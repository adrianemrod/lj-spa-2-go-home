import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";

/** Public service catalog for the booking portal — no auth, no internal fields. */
export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: { active: true },
      select: { id: true, name: true, description: true, durationMinutes: true, price: true, categoryId: true },
      orderBy: { price: "asc" },
    });
    return NextResponse.json({ services });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
