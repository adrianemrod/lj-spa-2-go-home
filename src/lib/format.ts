import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";

// Business timezone. Every date/time shown to a human, and every "what day
// is it right now" business-rule check, goes through this constant — never
// through the server's local locale, which may not be Asia/Manila.
export const BUSINESS_TIMEZONE = "Asia/Manila";

export function formatCurrency(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(n);
}

export function formatDateManila(date: Date, pattern = "MMM d, yyyy"): string {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, pattern);
}

export function formatTimeManila(date: Date, pattern = "h:mm a"): string {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, pattern);
}

export function formatDateTimeManila(date: Date, pattern = "MMM d, yyyy h:mm a"): string {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, pattern);
}

/** Minutes since midnight, Asia/Manila local time, for a given instant. */
export function minutesOfDayManila(date: Date): number {
  const zoned = toZonedTime(date, BUSINESS_TIMEZONE);
  return zoned.getHours() * 60 + zoned.getMinutes();
}

/** 0 = Sunday .. 6 = Saturday, in Asia/Manila local time. */
export function dayOfWeekManila(date: Date): number {
  return toZonedTime(date, BUSINESS_TIMEZONE).getDay();
}

/** Build a UTC instant from a Manila calendar date + minutes-of-day. */
export function manilaDateAndMinutesToUtc(date: Date, minutesOfDay: number): Date {
  const zoned = toZonedTime(date, BUSINESS_TIMEZONE);
  zoned.setHours(0, Math.round(minutesOfDay), 0, 0);
  return fromZonedTime(zoned, BUSINESS_TIMEZONE);
}

export function minutesToDurationLabel(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}
