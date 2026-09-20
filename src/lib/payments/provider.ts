export interface PaymentIntent {
  amount: number;
  currency: "PHP";
  reference: string;
}

export interface PaymentProvider {
  name: string;
  /**
   * Manual providers (cash, or a client paying an already-agreed amount
   * to the therapist/business directly) resolve immediately. A real
   * online gateway (PayMongo, Stripe, etc.) would return a redirect/
   * client-secret here instead — that's the point of the interface: the
   * booking flow doesn't change when a real gateway is wired in.
   */
  charge(intent: PaymentIntent): Promise<{ ok: boolean; reference: string; error?: string }>;
}
