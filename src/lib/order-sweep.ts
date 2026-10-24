import { prisma } from "@/lib/prisma";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { getMarketplaceSettings } from "@/lib/settings";
import { recordNeverShipped } from "@/lib/performance";

/**
 * Lazy "background job" sweeps — see lib/ledger.ts getSellerBalances() for the same
 * pattern used elsewhere. This environment has no cron/scheduled-job runner, so anything
 * that would traditionally run on a timer instead runs here, triggered by a real request
 * (checkout starting, an admin/seller orders page loading). Both functions are safe to
 * call as often as you like — they only ever act on rows that are actually due, and each
 * uses a persisted marker (order.status / order.neverShippedFlaggedAt) so a row is never
 * acted on twice.
 */

/**
 * Releases inventory reserved by a checkout that was started but never paid for. Stock is
 * decremented the moment a customer opens Stripe Checkout (see /api/checkout) to guarantee
 * no overselling; if they never complete payment, that unit would otherwise stay
 * "reserved" forever. Any PENDING_PAYMENT order older than
 * MarketplaceSettings.abandonedCheckoutMinutes is expired here and its stock restored.
 */
export async function releaseAbandonedCheckouts() {
  const settings = await getMarketplaceSettings();
  const cutoff = new Date(Date.now() - settings.abandonedCheckoutMinutes * 60_000);

  const stale = await prisma.order.findMany({
    where: { status: "PENDING_PAYMENT", createdAt: { lt: cutoff } },
    include: { items: true },
  });

  for (const order of stale) {
    // Guard against a race with the Stripe webhook marking this order PAID between our
    // query above and this update — only expire if it's still PENDING_PAYMENT.
    const result = await prisma.order.updateMany({
      where: { id: order.id, status: "PENDING_PAYMENT" },
      data: { status: "EXPIRED" },
    });
    if (result.count === 0) continue; // someone else (webhook) already moved it on

    await prisma.$transaction(
      order.items.map((item) =>
        prisma.product.updateMany({
          where: { id: item.productId, inventoryQuantity: { not: null } },
          data: { inventoryQuantity: { increment: item.quantity } },
        })
      )
    );

    if (isStripeConfigured() && order.stripeCheckoutSessionId) {
      try {
        await stripe.checkout.sessions.expire(order.stripeCheckoutSessionId);
      } catch {
        // Already expired/completed on Stripe's side — nothing to do.
      }
    }
  }

  return stale.length;
}

/**
 * Flags orders that are past their expected ship date but still haven't shipped, so
 * SellerPerformance.neverShippedOrders actually reflects reality instead of sitting at 0
 * forever (the counter and recordNeverShipped() existed before anything called them).
 * neverShippedFlaggedAt makes this idempotent — an order is only ever counted once, even
 * though this sweep may run many times against the same row before it finally ships.
 */
export async function flagNeverShippedOrders() {
  const overdue = await prisma.order.findMany({
    where: {
      status: { in: ["PAID", "PROCESSING"] },
      fulfillmentStatus: { in: ["UNFULFILLED", "PROCESSING"] },
      expectedShipDate: { lt: new Date() },
      neverShippedFlaggedAt: null,
    },
    select: { id: true, brandId: true },
  });

  for (const order of overdue) {
    // Guard the same way as above — only flag/count it once, even under concurrent sweeps.
    const result = await prisma.order.updateMany({
      where: { id: order.id, neverShippedFlaggedAt: null },
      data: { neverShippedFlaggedAt: new Date() },
    });
    if (result.count === 0) continue;
    await recordNeverShipped(order.brandId);
  }

  return overdue.length;
}

/** Convenience wrapper — call this from any admin/seller page that lists orders. */
export async function sweepOrders() {
  const [expired, flagged] = await Promise.all([releaseAbandonedCheckouts(), flagNeverShippedOrders()]);
  return { expired, flagged };
}
