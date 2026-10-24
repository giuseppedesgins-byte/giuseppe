import { prisma } from "@/lib/prisma";

/**
 * Central place for SellerPerformance counter updates so metric-affecting logic isn't
 * duplicated across refund/cancellation/fulfillment code paths (spec §23). Deliberately
 * does NOT auto-change `standing` based on thresholds — enforcement stays a manual admin
 * decision (see EnforcementAction / /admin/brands/[id]) until real penalty thresholds are
 * defined and approved. Marking a product out-of-stock BEFORE a sale never calls any of
 * these functions — that is explicitly not a performance-affecting event.
 */
export async function ensurePerformanceRow(brandId: string) {
  return prisma.sellerPerformance.upsert({
    where: { brandId },
    update: {},
    create: { brandId },
  });
}

export async function recordOrderCreated(brandId: string) {
  await ensurePerformanceRow(brandId);
  await prisma.sellerPerformance.update({ where: { brandId }, data: { totalOrders: { increment: 1 } } });
}

export async function recordFulfilled(brandId: string) {
  await ensurePerformanceRow(brandId);
  await prisma.sellerPerformance.update({ where: { brandId }, data: { fulfilledOrders: { increment: 1 } } });
}

export async function recordRefund(brandId: string) {
  await ensurePerformanceRow(brandId);
  await prisma.sellerPerformance.update({ where: { brandId }, data: { refunds: { increment: 1 } } });
}

/** Seller-caused cancellation ONLY — never call this for a pre-purchase out-of-stock mark. */
export async function recordSellerCausedCancellation(brandId: string) {
  await ensurePerformanceRow(brandId);
  await prisma.sellerPerformance.update({
    where: { brandId },
    data: { cancelledOrders: { increment: 1 }, sellerCausedCancellations: { increment: 1 } },
  });
}

/** Customer-initiated cancellation (not seller fault) — counted in the general total only. */
export async function recordCustomerCancellation(brandId: string) {
  await ensurePerformanceRow(brandId);
  await prisma.sellerPerformance.update({ where: { brandId }, data: { cancelledOrders: { increment: 1 } } });
}

export async function recordComplaint(brandId: string) {
  await ensurePerformanceRow(brandId);
  await prisma.sellerPerformance.update({ where: { brandId }, data: { complaints: { increment: 1 } } });
}

export async function recordNeverShipped(brandId: string) {
  await ensurePerformanceRow(brandId);
  await prisma.sellerPerformance.update({
    where: { brandId },
    data: { neverShippedOrders: { increment: 1 }, lateOrders: { increment: 1 } },
  });
}
