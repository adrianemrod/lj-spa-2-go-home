import "server-only";
import { manualProvider } from "@/lib/payments/manual-provider";
import type { PaymentProvider } from "@/lib/payments/provider";

export type { PaymentIntent, PaymentProvider } from "@/lib/payments/provider";

/**
 * PAYMENT_PROVIDER=manual (the .env.example default) is cash/GCash/Maya/
 * bank-transfer collected directly by staff or the therapist — always
 * available. A hosted gateway (PayMongo, Stripe) is configuration-
 * dependent: without PAYMENT_API_KEY there is nothing safe to fall back
 * to except manual collection, so that's what happens rather than faking
 * a successful online charge.
 */
export function activePaymentProvider(): PaymentProvider {
  switch (process.env.PAYMENT_PROVIDER) {
    case "paymongo":
    case "stripe":
      if (!process.env.PAYMENT_API_KEY) {
        console.warn(`PAYMENT_PROVIDER=${process.env.PAYMENT_PROVIDER} has no PAYMENT_API_KEY configured — falling back to manual.`);
        return manualProvider;
      }
      throw new Error(`Payment provider "${process.env.PAYMENT_PROVIDER}" is not implemented yet.`);
    default:
      return manualProvider;
  }
}
