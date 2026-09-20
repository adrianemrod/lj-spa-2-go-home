/**
 * Pure scheduling arithmetic — no I/O, no Date objects, just minutes.
 * Everything here is expressed in "minutes since some fixed reference
 * point" (either minutes-of-day in Asia/Manila, or minutes-since-epoch —
 * callers pick whichever is convenient as long as they're consistent
 * within one call) so it can be unit tested without a database or a
 * travel-time API call.
 */

/**
 * The moment a therapist is truly free to start moving toward a new job:
 * whatever they were doing ends at `fromTime`, then they need `travelMinutes`
 * to get there, then `bufferMinutes` of slack (parking, setup, traffic
 * margin) before they can actually begin.
 *
 * Example (spec critical TEST 1): a 90-minute massage ends at 3:30 PM,
 * travel is 30 minutes, buffer is 10 minutes -> next available is 4:10 PM.
 *   earliestReadyTime(15*60+30, 30, 10) === 16*60+10
 */
export function earliestReadyTime(fromTime: number, travelMinutes: number, bufferMinutes: number): number {
  return fromTime + travelMinutes + bufferMinutes;
}

/**
 * Can the therapist realistically be at the next commitment on time?
 *
 * Example (spec critical TEST 2): previous booking ends 4:30 PM, travel to
 * the next client requires 45 minutes, the next booking is at 5:00 PM ->
 * 4:30 + 45 = 5:15, which is AFTER 5:00, so this must reject/flag the
 * schedule as impossible, never silently show the therapist as available.
 *   canReachInTime(16*60+30, 45, 0, 17*60) === false
 */
export function canReachInTime(
  fromTime: number,
  travelMinutes: number,
  bufferMinutes: number,
  deadline: number
): boolean {
  return earliestReadyTime(fromTime, travelMinutes, bufferMinutes) <= deadline;
}

export interface GapFitInput {
  /** When the therapist becomes free to start moving toward this job. */
  freeAt: number;
  /** Travel time from wherever they are at `freeAt` to the new job's address. */
  travelInMinutes: number;
  /** Duration of the service being scheduled. */
  serviceDurationMinutes: number;
  /** Buffer applied after the service before the therapist can leave. */
  bufferMinutes: number;
  /**
   * The hard deadline this job must be clear of the location by — the
   * start of the next fixed commitment (already reduced by that
   * commitment's own required travel-in), or the end of the working
   * window if there's nothing booked after. `null` means no downstream
   * constraint (last job of the day).
   */
  deadline: number | null;
  /** Don't offer a start earlier than this (e.g. "now", or a client's requested earliest time). */
  notBefore?: number;
}

export interface GapFitResult {
  start: number;
  end: number;
}

/** Fit one service into one schedule gap, or return null if it doesn't fit. */
export function fitServiceInGap(input: GapFitInput): GapFitResult | null {
  const arrival = input.freeAt + input.travelInMinutes;
  const start = Math.max(arrival, input.notBefore ?? -Infinity);
  const end = start + input.serviceDurationMinutes;
  if (input.deadline !== null && end + input.bufferMinutes > input.deadline) {
    return null;
  }
  return { start, end };
}

export interface WorkingWindow {
  startMinutes: number;
  endMinutes: number;
}

/** Working hours minus a lunch/rest break, expressed as one or two windows. */
export function splitWindowByBreak(
  window: WorkingWindow,
  breakStart?: number | null,
  breakEnd?: number | null
): WorkingWindow[] {
  if (breakStart == null || breakEnd == null) return [window];
  if (breakEnd <= window.startMinutes || breakStart >= window.endMinutes) return [window];
  const windows: WorkingWindow[] = [];
  if (breakStart > window.startMinutes) {
    windows.push({ startMinutes: window.startMinutes, endMinutes: Math.min(breakStart, window.endMinutes) });
  }
  if (breakEnd < window.endMinutes) {
    windows.push({ startMinutes: Math.max(breakEnd, window.startMinutes), endMinutes: window.endMinutes });
  }
  return windows;
}
