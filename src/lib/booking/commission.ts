import type { CommissionType } from "@prisma/client";

/**
 * Configurable commission engine (spec section 44) — flat, percentage,
 * service-specific, and therapist-specific-override all resolve through
 * this one function so there is exactly one place commission math happens.
 */
export function calculateCommission(
  baseAmount: number,
  type: CommissionType,
  value: number
): number {
  const amount = type === "PERCENTAGE" ? (baseAmount * value) / 100 : value;
  return Math.round(amount * 100) / 100;
}

export function resolveCommissionRule(params: {
  service: { commissionType: CommissionType; commissionValue: number };
  therapistOverride?: { customCommissionType: CommissionType | null; customCommissionValue: number | null } | null;
}): { type: CommissionType; value: number } {
  const override = params.therapistOverride;
  if (override?.customCommissionType != null && override.customCommissionValue != null) {
    return { type: override.customCommissionType, value: override.customCommissionValue };
  }
  return { type: params.service.commissionType, value: params.service.commissionValue };
}
