import { prisma } from "@/lib/prisma";
import { getMarketplaceSettings } from "@/lib/settings";

/**
 * Seller balance ledger — the one place SellerLedgerEntry rows get written and balances
 * get computed. A seller's balance is NEVER stored as an editable number; it's always
 * derived from these append-only rows (spec "Seller Balances": never represent balances
 * as arbitrary editable numbers).
 */

/** SALE (+gross total) and COMMISSION (-commission) as soon as an order is paid — both PENDING. */
export async function recordSaleOnPayment(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  await prisma.$transaction([
    prisma.sellerLedgerEntry.create({
      data: { brandId: order.brandId, orderId: order.id, type: "SALE", amountCents: order.totalCents, status: "PENDING" },
    }),
    prisma.sellerLedgerEntry.create({
      data: { brandId: order.brandId, orderId: order.id, type: "COMMISSION", amountCents: -order.commissionCents, status: "PENDING" },
    }),
  ]);
}

/** A refund/cancellation reversal — always immediate (REVERSED), never sits PENDING. */
export async function recordRefundReversal(params: {
  orderId: string;
  brandId: string;
  refundCents: number;
  isFullRefund: boolean;
}) {
  if (params.refundCents <= 0) return;
  await prisma.sellerLedgerEntry.create({
    data: {
      brandId: params.brandId,
      orderId: params.orderId,
      type: params.isFullRefund ? "REFUND" : "PARTIAL_REFUND",
      amountCents: -params.refundCents,
      status: "REVERSED",
    },
  });
}

/** The seller-fault processor fee (see lib/pricing.ts) as its own ledger line. */
export async function recordProcessorFeeAdjustment(params: { orderId: string; brandId: string; feeCents: number }) {
  if (params.feeCents <= 0) return;
  await prisma.sellerLedgerEntry.create({
    data: {
      brandId: params.brandId,
      orderId: params.orderId,
      type: "ADJUSTMENT",
      amountCents: -params.feeCents,
      status: "REVERSED",
      reason: "Processor fee — seller-fault refund",
    },
  });
}

/**
 * Records that Giuseppe paid a seller OUTSIDE this system (wire, PayPal, whatever's in
 * use before Stripe Connect is configured) — this is bookkeeping of a manual payment
 * already made, not an instruction that moves real money itself.
 */
export async function recordPayout(params: { brandId: string; amountCents: number; reason?: string }) {
  await prisma.sellerLedgerEntry.create({
    data: { brandId: params.brandId, type: "PAYOUT", amountCents: -params.amountCents, status: "PAID_OUT", reason: params.reason },
  });
}

/** Chargeback visibility — see PaymentDispute + the webhook handler. Puts the disputed amount on hold. */
export async function recordChargeback(params: { orderId: string; brandId: string; amountCents: number }) {
  await prisma.sellerLedgerEntry.create({
    data: {
      brandId: params.brandId,
      orderId: params.orderId,
      type: "CHARGEBACK",
      amountCents: -params.amountCents,
      status: "PENDING",
      reason: "Payment dispute opened",
    },
  });
}

/**
 * Called whenever an order's fulfillmentStatus is being updated — if it's transitioning
 * to DELIVERED for the first time, stamps deliveredAt and computes payoutEligibleAt from
 * the CURRENT MarketplaceSettings.postDeliveryHoldDays (a one-time snapshot; see schema
 * comment). Returns an empty object otherwise, so callers can always spread the result
 * into their prisma.order.update() data without an extra branch.
 */
export async function computeDeliveryFields(currentDeliveredAt: Date | null, newFulfillmentStatus: string) {
  if (newFulfillmentStatus !== "DELIVERED" || currentDeliveredAt) return {};
  const settings = await getMarketplaceSettings();
  const deliveredAt = new Date();
  const payoutEligibleAt = new Date(deliveredAt.getTime() + settings.postDeliveryHoldDays * 24 * 60 * 60 * 1000);
  return { deliveredAt, payoutEligibleAt };
}

/**
 * Computes a seller's balance breakdown: pending, available, paid out, reversed (all in
 * cents; reversed is a negative running total representing money given back). As a side
 * effect, lazily flips any PENDING entry to AVAILABLE once its order's payoutEligibleAt
 * has passed and there's no open hold blocking it — this stands in for a scheduled
 * "release" job without needing one; balances are always correct whenever this is called,
 * and the flip is idempotent (safe to compute repeatedly).
 */
export async function getSellerBalances(brandId: string) {
  const [entries, openHolds] = await Promise.all([
    prisma.sellerLedgerEntry.findMany({ where: { brandId }, include: { order: true } }),
    prisma.payoutHold.findMany({ where: { brandId, status: "OPEN" } }),
  ]);

  const brandWideHold = openHolds.some((h) => h.orderId === null);
  const heldOrderIds = new Set(openHolds.filter((h) => h.orderId).map((h) => h.orderId as string));

  const now = new Date();
  const toRelease: string[] = [];
  let pendingCents = 0;
  let availableCents = 0;
  let paidOutCents = 0;
  let reversedCents = 0;

  for (const entry of entries) {
    let effectiveStatus = entry.status;
    if (effectiveStatus === "PENDING") {
      const eligible = Boolean(entry.order?.payoutEligibleAt && entry.order.payoutEligibleAt <= now);
      const held = brandWideHold || (entry.orderId ? heldOrderIds.has(entry.orderId) : false);
      if (eligible && !held) {
        effectiveStatus = "AVAILABLE";
        toRelease.push(entry.id);
      }
    }
    if (effectiveStatus === "PENDING") pendingCents += entry.amountCents;
    else if (effectiveStatus === "AVAILABLE") availableCents += entry.amountCents;
    else if (effectiveStatus === "PAID_OUT") paidOutCents += entry.amountCents;
    else if (effectiveStatus === "REVERSED") reversedCents += entry.amountCents;
  }

  if (toRelease.length > 0) {
    await prisma.sellerLedgerEntry.updateMany({ where: { id: { in: toRelease } }, data: { status: "AVAILABLE" } });
  }

  return { pendingCents, availableCents, paidOutCents, reversedCents };
}
