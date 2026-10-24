import { prisma } from "@/lib/prisma";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { SITE_URL } from "@/lib/brand";

/**
 * Makes the $29/mo (configurable via Membership.monthlyPriceCents) founding-brand
 * membership fee an actual recurring Stripe charge instead of a number Giuseppe just
 * tracks. A Membership row is created (TRIAL status) the moment a brand application is
 * approved (see /admin/applications/[id]) — this module is what turns that into a real
 * subscription once the seller sets up billing from their portal.
 *
 * FLAG: this bills the SELLER for their Giuseppe membership, which is a completely
 * separate money flow from a customer paying for a product (see /api/checkout and the
 * still-open Stripe Connect decision in lib/stripe.ts). Membership billing settles
 * directly to Giuseppe's own Stripe account either way, so it does NOT depend on the
 * Connect decision and is safe to run independently.
 */
const STRIPE_STATUS_TO_MEMBERSHIP_STATUS: Record<string, "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED"> = {
  trialing: "TRIAL",
  active: "ACTIVE",
  past_due: "PAST_DUE",
  incomplete: "PAST_DUE",
  incomplete_expired: "CANCELLED",
  canceled: "CANCELLED",
  unpaid: "PAST_DUE",
};

/**
 * Creates a Stripe Checkout Session (subscription mode) for a seller to put a card on
 * file for their membership. If they're still inside their trial window, the
 * subscription is created in trialing status and the first real charge happens at
 * trialEndsAt — Stripe requires trial_end to be at least 48 hours out, so a trial ending
 * sooner than that just starts billing immediately instead.
 */
export async function createMembershipCheckoutSession(brandId: string, sellerToken: string) {
  if (!isStripeConfigured()) {
    // Dev fallback, same pattern as /api/checkout — no live Stripe keys in this
    // environment, so there's nothing real to redirect to.
    return `${SITE_URL}/seller/${sellerToken}?billingSetup=mock`;
  }

  const membership = await prisma.membership.findUniqueOrThrow({ where: { brandId }, include: { brand: true } });

  const minTrialEnd = Math.floor(Date.now() / 1000) + 48 * 60 * 60;
  const trialEndUnix = membership.trialEndsAt ? Math.floor(membership.trialEndsAt.getTime() / 1000) : null;
  const useTrial = membership.status === "TRIAL" && trialEndUnix && trialEndUnix > minTrialEnd;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: membership.monthlyPriceCents,
          recurring: { interval: "month" },
          product_data: { name: `Giuseppe Seller Membership — ${membership.brand.name}` },
        },
      },
    ],
    // metadata has to be set on subscription_data too, not just the session — the created
    // Subscription object doesn't automatically inherit the session's metadata, and the
    // webhook's customer.subscription.* handlers need membershipId to find the right row.
    subscription_data: {
      ...(useTrial ? { trial_end: trialEndUnix! } : {}),
      metadata: { membershipId: membership.id, brandId },
    },
    metadata: { membershipId: membership.id, brandId },
    success_url: `${SITE_URL}/seller/${sellerToken}?billingSetup=1`,
    cancel_url: `${SITE_URL}/seller/${sellerToken}`,
  });

  return session.url ?? `${SITE_URL}/seller/${sellerToken}`;
}

/** Lets a seller who already has billing set up manage/cancel it via Stripe's own hosted UI. */
export async function createMembershipBillingPortalSession(brandId: string, sellerToken: string) {
  if (!isStripeConfigured()) return null;
  const membership = await prisma.membership.findUniqueOrThrow({ where: { brandId } });
  if (!membership.stripeCustomerId) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer: membership.stripeCustomerId,
    return_url: `${SITE_URL}/seller/${sellerToken}`,
  });
  return session.url;
}

/** Called from the Stripe webhook on checkout.session.completed (mode=subscription). */
export async function attachMembershipCheckout(session: { customer?: string | null; subscription?: string | null; metadata?: Record<string, string> | null }) {
  const membershipId = session.metadata?.membershipId;
  if (!membershipId || !session.subscription) return;
  await prisma.membership.update({
    where: { id: membershipId },
    data: {
      stripeSubscriptionId: String(session.subscription),
      stripeCustomerId: session.customer ? String(session.customer) : undefined,
    },
  });
}

/** Called from the Stripe webhook on customer.subscription.{created,updated,deleted}. */
export async function syncMembershipFromSubscription(subscription: { id: string; status: string; metadata?: Record<string, string> | null }) {
  const membershipId = subscription.metadata?.membershipId;
  const membership = membershipId
    ? await prisma.membership.findUnique({ where: { id: membershipId } })
    : await prisma.membership.findFirst({ where: { stripeSubscriptionId: subscription.id } });
  if (!membership) return;

  const status = STRIPE_STATUS_TO_MEMBERSHIP_STATUS[subscription.status] ?? membership.status;
  await prisma.membership.update({
    where: { id: membership.id },
    data: { stripeSubscriptionId: subscription.id, status },
  });
}
