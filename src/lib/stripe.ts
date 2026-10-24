import Stripe from "stripe";

/**
 * Stripe Connect architecture — DECIDED (Aug 2026): Express connected accounts +
 * destination charges. See lib/connect.ts for the full onboarding flow and rationale.
 * Quick summary of what was resolved vs. still open:
 *
 * 1. Account type: Express (Standard and Custom were the alternatives — see README).
 * 2. Charge type: destination charges — Giuseppe's platform account stays merchant of
 *    record, funds flow platform -> connected account via payment_intent_data.transfer_data
 *    at checkout (see /api/checkout/route.ts), which is what lets the payout-hold/case
 *    system (lib/ledger.ts) keep working — Giuseppe can still freeze/reverse a payout
 *    before it settles, unlike under Standard accounts.
 * 3. Refund responsibility & flow: RESOLVED — Giuseppe does NOT retain its commission on
 *    refunds; full or partial refunds are supported in /admin/orders/[id] and kept in sync
 *    with refunds issued directly in Stripe via the refund.updated webhook.
 * 4. Tax collection (Stripe Tax): built and wired up, OFF by default — see
 *    isAutomaticTaxEnabled() below and .env.example. Still needs Giuseppe to actually
 *    register to collect tax before flipping it on; that's a real compliance step, not a
 *    code change.
 * 5. Payout timing/schedule for connected accounts: STILL OPEN — Express accounts use
 *    Stripe's default payout schedule (rolling, typically daily after a short delay)
 *    unless you configure something else in the Stripe Dashboard once accounts exist.
 *    Giuseppe's own pending -> available hold window (lib/ledger.ts, MarketplaceSettings)
 *    is separate from and in addition to Stripe's own payout delay.
 *
 * DO NOT flip STRIPE_SECRET_KEY to a live key until you've tested this end-to-end in
 * Stripe test mode, including onboarding a test connected account.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2024-06-20",
});

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes("placeholder"));
}

/**
 * Whether checkout should ask Stripe Tax to calculate + collect sales tax/VAT. Defaults to
 * false — see .env.example STRIPE_AUTOMATIC_TAX_ENABLED for why this needs a real Stripe
 * Dashboard step (enabling Stripe Tax + registering in your nexus states/countries) before
 * it's safe to turn on, not just a code change.
 */
export function isAutomaticTaxEnabled() {
  return isStripeConfigured() && process.env.STRIPE_AUTOMATIC_TAX_ENABLED === "true";
}
