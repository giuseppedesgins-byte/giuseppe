import Stripe from "stripe";

/**
 * FLAG — Stripe Connect architecture (needs business + Stripe configuration confirmation
 * before any live payment):
 *
 * 1. Account type: Standard vs. Express vs. Custom connected accounts. This affects who is
 *    "merchant of record," onboarding friction for sellers, and Giuseppe's liability.
 * 2. Charge type: destination charges (Giuseppe's platform account is MoR, funds flow
 *    platform -> connected account) vs. separate charges and transfers vs. direct charges
 *    (seller is MoR). This determines who is responsible for disputes/chargebacks.
 * 3. Refund responsibility & flow: RESOLVED for now — business decision made that
 *    Giuseppe does NOT retain its commission on refunds; full order total (product +
 *    shipping) is refunded to the customer. Implemented as a full-refund-only flow (no
 *    partial refunds yet) in /admin/orders/[id] and kept in sync with refunds issued
 *    directly in Stripe via the charge.refunded webhook. Revisit if partial refunds or
 *    commission-retention-on-refund policy changes are ever needed.
 * 4. Tax collection (Stripe Tax vs. manual) and who remits sales tax/VAT.
 * 5. Payout timing/schedule for connected accounts.
 *
 * Nothing below assumes an answer to the above — it scaffolds a destination-charge flow
 * (the most common marketplace pattern) behind a single function so it can be swapped.
 * DO NOT flip STRIPE_SECRET_KEY to a live key until these are confirmed with Stripe/legal.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2024-06-20",
});

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes("placeholder"));
}
