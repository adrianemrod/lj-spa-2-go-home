import { prisma } from "@/lib/prisma";

/**
 * Booking numbers look like LJ-2026-000123 — year is the Manila calendar
 * year, sequence is per-year. Generated inside the same transaction that
 * creates the booking so two concurrent requests can never collide.
 */
export async function nextBookingNumber(
  tx: Pick<typeof prisma, "booking">,
  manilaYear: number
): Promise<string> {
  const prefix = `LJ-${manilaYear}-`;
  const last = await tx.booking.findFirst({
    where: { bookingNumber: { startsWith: prefix } },
    orderBy: { bookingNumber: "desc" },
    select: { bookingNumber: true },
  });
  const lastSeq = last ? Number(last.bookingNumber.slice(prefix.length)) : 0;
  const nextSeq = lastSeq + 1;
  return `${prefix}${String(nextSeq).padStart(6, "0")}`;
}
