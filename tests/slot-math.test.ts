import { describe, expect, it } from "vitest";
import { earliestReadyTime, canReachInTime, fitServiceInGap, splitWindowByBreak } from "@/lib/scheduling/slot-math";

const toMin = (h: number, m: number) => h * 60 + m;

describe("earliestReadyTime — spec critical TEST 1", () => {
  it("90-minute massage ends 3:30 PM, travel 30 min, buffer 10 min -> next available 4:10 PM", () => {
    const result = earliestReadyTime(toMin(15, 30), 30, 10);
    expect(result).toBe(toMin(16, 10));
  });
});

describe("canReachInTime — spec critical TEST 2", () => {
  it("rejects a schedule where travel makes the next booking impossible", () => {
    // Previous booking ends 4:30 PM, travel to next client is 45 minutes,
    // next booking is fixed at 5:00 PM. 4:30 + 45 = 5:15 > 5:00 -> impossible.
    const ok = canReachInTime(toMin(16, 30), 45, 0, toMin(17, 0));
    expect(ok).toBe(false);
  });

  it("accepts a schedule with enough travel + buffer margin", () => {
    const ok = canReachInTime(toMin(14, 0), 20, 10, toMin(14, 45));
    expect(ok).toBe(true);
  });
});

describe("fitServiceInGap", () => {
  it("fits a service when there is enough room before the next commitment", () => {
    const fit = fitServiceInGap({
      freeAt: toMin(10, 0),
      travelInMinutes: 15,
      serviceDurationMinutes: 60,
      bufferMinutes: 10,
      deadline: toMin(12, 0),
    });
    expect(fit).toEqual({ start: toMin(10, 15), end: toMin(11, 15) });
  });

  it("returns null when the service plus buffer would blow past the deadline", () => {
    const fit = fitServiceInGap({
      freeAt: toMin(10, 0),
      travelInMinutes: 15,
      serviceDurationMinutes: 90,
      bufferMinutes: 15,
      deadline: toMin(12, 0),
    });
    // arrival 10:15 + 90 min = 11:45, +15 buffer = 12:00 -> exactly at deadline, fits
    expect(fit).not.toBeNull();
  });

  it("rejects when travel alone eats the whole gap", () => {
    const fit = fitServiceInGap({
      freeAt: toMin(10, 0),
      travelInMinutes: 90,
      serviceDurationMinutes: 60,
      bufferMinutes: 10,
      deadline: toMin(11, 0),
    });
    expect(fit).toBeNull();
  });

  it("never offers a start before notBefore even if the therapist is free earlier", () => {
    const fit = fitServiceInGap({
      freeAt: toMin(8, 0),
      travelInMinutes: 10,
      serviceDurationMinutes: 30,
      bufferMinutes: 5,
      deadline: null,
      notBefore: toMin(9, 0),
    });
    expect(fit?.start).toBe(toMin(9, 0));
  });

  it("has no downstream constraint when deadline is null (last job of the day)", () => {
    const fit = fitServiceInGap({
      freeAt: toMin(18, 0),
      travelInMinutes: 20,
      serviceDurationMinutes: 120,
      bufferMinutes: 15,
      deadline: null,
    });
    expect(fit).not.toBeNull();
  });
});

describe("splitWindowByBreak", () => {
  it("splits a 9-6 working day around a 12-1 lunch break", () => {
    const windows = splitWindowByBreak({ startMinutes: toMin(9, 0), endMinutes: toMin(18, 0) }, toMin(12, 0), toMin(13, 0));
    expect(windows).toEqual([
      { startMinutes: toMin(9, 0), endMinutes: toMin(12, 0) },
      { startMinutes: toMin(13, 0), endMinutes: toMin(18, 0) },
    ]);
  });

  it("returns the window unchanged when there is no break", () => {
    const window = { startMinutes: toMin(9, 0), endMinutes: toMin(18, 0) };
    expect(splitWindowByBreak(window)).toEqual([window]);
  });
});
