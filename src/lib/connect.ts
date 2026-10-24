import { prisma } from "@/lib/prisma";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { SITE_URL } from "@/lib/brand";

/**
 * Stripe Connect — decision made (Aug 2026): Express connected accounts + destination
 * charges. Sellers get a short, Stripe-hosted onboarding flow (identity, bank account) and
 * never see a full Stripe dashboard; Giuseppe stays the merchant of record, which is what
 * lets the existing payout-hold/case/refund system (lib/ledger.ts, /admin/issues) keep
 * working exactly as built — Giuseppe can still freeze or reverse a payout before it
 * settles, which isn't true under Standard accounts (seller is their own MoR there).
 *
 * Flow: seller clicks "Connect your bank account" in the seller portal ->
 * createExpressAccountLink() creates (if needed) a connected account + a one-time
 * onboarding link -> seller completes Stripe's hosted onboarding -> Stripe redirects back
 * and separately fires account.updated webhooks as their verification status changes ->
 * webhook flips SellerAccount.stripeOnboardingComplete once charges_enabled AND
 * payouts_enabled are both true. Checkout only routes funds via Connect
 * (payment_intent_data.transfer_data) once that flag is true — until then, checkout falls
 * back to the original platform-only flow (ledger bookkeeping, manual payout recording),
 * so nothing breaks for brands who haven't onboarded yet.
 *
 * KNOWN GAP: if Stripe Tax (lib/stripe.ts isAutomaticTaxEnabled()) is ever turned on
 * together with Connect, the tax portion of a sale currently flows to the seller's
 * connected account along with their payout rather than being held back for Giuseppe to
 * remit — see the comment in /api/checkout/route.ts. Revisit before running both together.
 */
export async function createExpressAccountLink(brandId: string, sellerToken: string) {
  if (!isStripeConfigured()) return null;

  const sellerAccount = await prisma.sellerAccount.findUniqueOrThrow({ where: { brandId }, include: { brand: true } });

  let accountId = sellerAccount.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: sellerAccount.payoutEmail ?? undefined,
      business_profile: { name: sellerAccount.brand.name, url: sellerAccount.brand.website ?? undefined },
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    });
    accountId = account.id;
    await prisma.sellerAccount.update({ where: { id: sellerAccount.id }, data: { stripeAccountId: accountId } });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${SITE_URL}/seller/${sellerToken}?connectRefresh=1`,
    return_url: `${SITE_URL}/seller/${sellerToken}?connectReturn=1`,
    type: "account_onboarding",
  });

  return link.url;
}

/** Called from the Stripe webhook on account.updated. */
export async function syncConnectedAccountStatus(account: { id: string; charges_enabled?: boolean; payouts_enabled?: boolean }) {
  const sellerAccount = await prisma.sellerAccount.findFirst({ where: { stripeAccountId: account.id } });
  if (!sellerAccount) return;
  const complete = Boolean(account.charges_enabled && account.payouts_enabled);
  if (complete !== sellerAccount.stripeOnboardingComplete) {
    await prisma.sellerAccount.update({ where: { id: sellerAccount.id }, data: { stripeOnboardingComplete: complete } });
  }
}
