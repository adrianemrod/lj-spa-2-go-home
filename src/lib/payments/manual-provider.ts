import type { PaymentIntent, PaymentProvider } from "@/lib/payments/provider";

/**
 * Cash / manual bank transfer / GCash-Maya-paid-directly-to-staff. This is
 * always available regardless of PAYMENT_PROVIDER — it's what the Payment
 * records created by the booking flow actually represent today. An online
 * gateway provider would implement the same interface and get selected in
 * src/lib/payments/index.ts without the booking code changing.
 */
export const manualProvider: PaymentProvider = {
  name: "manual",
  async charge(intent: PaymentIntent) {
    return { ok: true, reference: intent.reference };
  },
};
