import { describe, expect, it } from "vitest";
import { toPublicAvailability } from "@/lib/scheduling/public-availability";
import type { TherapistRecommendation } from "@/lib/scheduling/recommend";

const BASE: TherapistRecommendation = {
  therapistId: "t1",
  name: "Maria Santos",
  photoUrl: null,
  ratingAvg: 4.8,
  distanceKm: 12.3,
  today: {
    available: true,
    date: new Date("2026-09-21"),
    start: new Date("2026-09-21T09:05:00Z"),
    end: new Date("2026-09-21T10:35:00Z"),
    travelInMinutes: 25,
    distanceInKm: 12.3,
    originLat: 14.676,
    originLng: 121.0437,
  },
};

describe("toPublicAvailability — GPS privacy (spec sections 11 & 13)", () => {
  it("never includes therapist coordinates for an available slot", () => {
    const result = toPublicAvailability(BASE);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/1[24]\.\d/); // no latitude-looking numbers
    expect(result).not.toHaveProperty("originLat");
    expect(result).not.toHaveProperty("originLng");
    expect(result).not.toHaveProperty("distanceKm");
    expect(result.availableNow).toBe(true);
  });

  it("never includes coordinates for a future 'next available' slot either", () => {
    const rec: TherapistRecommendation = {
      ...BASE,
      today: { available: false, reason: "DAY_OFF", date: new Date("2026-09-20") },
      next: {
        available: true,
        date: new Date("2026-09-21"),
        start: new Date("2026-09-21T01:05:00Z"),
        end: new Date("2026-09-21T02:35:00Z"),
        travelInMinutes: 5,
        distanceInKm: 0,
        originLat: 14.5547,
        originLng: 121.0244,
      },
    };
    const result = toPublicAvailability(rec);
    expect(JSON.stringify(result)).not.toContain("originLat");
    expect(JSON.stringify(result)).not.toContain("14.5547");
    expect(result.availableNow).toBe(false);
    expect(result.nextAvailableStart).toBe("2026-09-21T01:05:00.000Z");
  });

  it("degrades gracefully when nothing is available in the search window", () => {
    const rec: TherapistRecommendation = {
      ...BASE,
      today: { available: false, reason: "NO_SLOT_AVAILABLE", date: new Date("2026-09-20") },
    };
    const result = toPublicAvailability(rec);
    expect(result.availableNow).toBe(false);
    expect(result.nextAvailableStart).toBeNull();
  });

  it("only exposes name, photo, rating — never internal fields like maxTravelRadiusKm or homeLat", () => {
    const result = toPublicAvailability(BASE);
    const allowedKeys = ["therapistId", "name", "photoUrl", "ratingAvg", "availableNow", "nextAvailableLabel", "nextAvailableStart"];
    expect(Object.keys(result).sort()).toEqual(allowedKeys.sort());
  });
});
