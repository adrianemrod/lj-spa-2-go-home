import { describe, expect, it } from "vitest";
import { calculateCommission, resolveCommissionRule } from "@/lib/booking/commission";
import { canTransitionBooking } from "@/lib/booking/status-machine";
import { canTransitionTherapistStatus } from "@/lib/therapist-status/state-machine";

describe("calculateCommission", () => {
  it("computes a percentage commission (90-minute Deep Tissue at 35%)", () => {
    expect(calculateCommission(1800, "PERCENTAGE", 35)).toBe(630);
  });

  it("computes a flat commission regardless of the base amount", () => {
    expect(calculateCommission(1800, "FLAT", 250)).toBe(250);
  });

  it("prefers a therapist-specific override over the service default", () => {
    const rule = resolveCommissionRule({
      service: { commissionType: "PERCENTAGE", commissionValue: 30 },
      therapistOverride: { customCommissionType: "PERCENTAGE", customCommissionValue: 40 },
    });
    expect(rule).toEqual({ type: "PERCENTAGE", value: 40 });
  });

  it("falls back to the service default when there is no override", () => {
    const rule = resolveCommissionRule({
      service: { commissionType: "PERCENTAGE", commissionValue: 30 },
      therapistOverride: null,
    });
    expect(rule).toEqual({ type: "PERCENTAGE", value: 30 });
  });
});

describe("booking status transitions", () => {
  it("allows the full happy-path timeline", () => {
    expect(canTransitionBooking("PENDING", "ASSIGNED")).toBe(true);
    expect(canTransitionBooking("ASSIGNED", "TRAVELING")).toBe(true);
    expect(canTransitionBooking("TRAVELING", "ARRIVED")).toBe(true);
    expect(canTransitionBooking("ARRIVED", "IN_SERVICE")).toBe(true);
    expect(canTransitionBooking("IN_SERVICE", "COMPLETED")).toBe(true);
  });

  it("rejects skipping straight from ASSIGNED to IN_SERVICE", () => {
    expect(canTransitionBooking("ASSIGNED", "IN_SERVICE")).toBe(false);
  });

  it("never allows leaving a completed booking (completed financial records are immutable)", () => {
    expect(canTransitionBooking("COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransitionBooking("COMPLETED", "PENDING")).toBe(false);
  });
});

describe("therapist status transitions", () => {
  it("allows the full happy-path timeline", () => {
    expect(canTransitionTherapistStatus("OFFLINE", "AVAILABLE")).toBe(true);
    expect(canTransitionTherapistStatus("AVAILABLE", "RESERVED")).toBe(true);
    expect(canTransitionTherapistStatus("RESERVED", "TRAVELING")).toBe(true);
    expect(canTransitionTherapistStatus("TRAVELING", "ARRIVED")).toBe(true);
    expect(canTransitionTherapistStatus("ARRIVED", "IN_SERVICE")).toBe(true);
    expect(canTransitionTherapistStatus("IN_SERVICE", "COMPLETED")).toBe(true);
  });

  it("rejects jumping straight from AVAILABLE to IN_SERVICE", () => {
    expect(canTransitionTherapistStatus("AVAILABLE", "IN_SERVICE")).toBe(false);
  });
});
