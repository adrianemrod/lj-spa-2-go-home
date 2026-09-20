import "server-only";
import { prisma } from "@/lib/prisma";
import { dayOfWeekManila } from "@/lib/format";
import { splitWindowByBreak, type WorkingWindow } from "@/lib/scheduling/slot-math";

/**
 * Working windows (minutes-of-day, Asia/Manila) for a therapist on a given
 * calendar date, after removing their lunch/rest break and days off.
 * Empty array means "not working that day" — day off, inactive schedule
 * row, or no working-hours row configured at all.
 */
export async function getWorkingWindowsForDate(therapistId: string, date: Date): Promise<WorkingWindow[]> {
  const dayOff = await prisma.therapistDayOff.findUnique({
    where: { therapistId_date: { therapistId, date } },
  });
  if (dayOff) return [];

  const dow = dayOfWeekManila(date);
  const hours = await prisma.therapistWorkingHours.findUnique({
    where: { therapistId_dayOfWeek: { therapistId, dayOfWeek: dow } },
  });
  if (!hours || !hours.isActive) return [];

  return splitWindowByBreak(
    { startMinutes: hours.startMinutes, endMinutes: hours.endMinutes },
    hours.breakStartMinutes,
    hours.breakEndMinutes
  );
}
