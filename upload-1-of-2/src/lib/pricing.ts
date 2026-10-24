/**
 * Central pricing configuration.
 *
 * Nothing money-related is hardcoded in business logic — it all reads from here so
 * membership pricing and commission rates can change without touching order/checkout code.
 * Persisted per-brand overrides live on `Brand.commissionBps` and `Membership`; these are
 * just the defaults used when creating new records.
 */
export const DEFAULT_COMMISSION_BPS = 900; // 9.00%
export const FOUNDING_BRAND_TRIAL_MONTHS = 3;
export const FOUNDING_BRAND_MONTHLY_PRICE_CENTS = 2900; // $29/mo after trial
export const STANDARD_BRAND_MONTHLY_PRICE_CENTS = 15000; // ~$150/mo, future standard tier

/** " — Size M / Black" style suffix for an OrderItem's selected variant options, or "" if none. */
export function variantLabel(options: unknown) {
  if (!options || typeof options !== "object") return "";
  const o = options as Record<string, string>;
  const parts = [o.size ? `Size ${o.size}` : null, o.color ?? null].filter(Boolean);
  return parts.length > 0 ? ` — ${parts.join(" / ")}` : "";
}

export function formatPrice(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function bpsToPercentLabel(bps: number) {
  return `${(bps / 100).toFixed(2)}%`;
}

/** Splits an order subtotal + shipping into Giuseppe commission and seller payout. */
export function calculateOrderSplit(params: {
  subtotalCents: number;
  shippingCostCents: number;
  commissionBps: number;
}) {
  const { subtotalCents, shippingCostCents, commissionBps } = params;
  const totalCents = subtotalCents + shippingCostCents;
  // FLAG: whether commission applies to shipping is a business decision — currently
  // commission is charged on product subtotal only, not shipping. Confirm before launch.
  const commissionCents = Math.round((subtotalCents * commissionBps) / 10000);
  const sellerAmountCents = totalCents - commissionCents;
  return { totalCents, commissionCents, sellerAmountCents };
}

/**
 * Recomputes the commission Giuseppe retains after a refund (full or partial) — spec's
 * worked example: $100 sale (9% = $9 commission), $20 refunded -> $80 net retained ->
 * commission recalculated as 9% of $80 = $7.20 (i.e. $1.80 of the original $9 is given
 * back). A full refund always nets to $0 commission, matching the existing full-refund
 * policy. Integer cents throughout — no floating-point money math.
 *
 * Simplification: `cumulativeRefundedCents` is treated as reducing the commissionable
 * product subtotal directly (capped at subtotalCents) — i.e. a refund is assumed to come
 * out of the product price before shipping. Good enough for V1 where refunds are
 * typically "give the customer their money back," but flagged here in case Giuseppe ever
 * needs to refund shipping-only vs. product-only as separate line items.
 */
/**
 * Processor-fee-on-refund policy (business decision, Aug 2026): when a refund is the
 * SELLER's fault (they shipped the wrong item, it arrived damaged, they couldn't fulfill,
 * etc.), the seller — not Giuseppe — absorbs Stripe's non-refundable processing fee on
 * that sale. Refunds that aren't the seller's fault (customer changed their mind, a
 * Giuseppe pricing error, a duplicate order) do not carry this charge.
 *
 * We don't have live Stripe fee data wired up (that needs a separate balance-transaction
 * integration), so this is a flat estimate using Stripe's standard U.S. card rate. Tune
 * these two constants if your actual blended rate differs.
 */
export const PROCESSOR_FEE_BPS = 290; // 2.9%
export const PROCESSOR_FEE_FIXED_CENTS = 30; // + $0.30 per charge

export function estimateProcessorFeeCents(chargeAmountCents: number) {
  return Math.round((chargeAmountCents * PROCESSOR_FEE_BPS) / 10000) + PROCESSOR_FEE_FIXED_CENTS;
}

/**
 * Reason codes that count as "seller's fault" for the processor-fee policy above. This is
 * a reasonable-default business categorization, not a legal determination — adjust freely.
 * NEVER_ARRIVED, LOST_IN_TRANSIT, DUPLICATE_ORDER, PRICING_ERROR, CUSTOMER_CHANGED_MIND,
 * CUSTOMER_ORDERED_WRONG_ITEM, SIZE_FIT_ISSUE, and OTHER are deliberately excluded —
 * they're either a carrier issue, a Giuseppe-side error, or a customer preference, not
 * something the seller did.
 */
const SELLER_FAULT_REASON_CODES = new Set([
  "OUT_OF_STOCK_AFTER_PURCHASE",
  "UNABLE_TO_FULFILL",
  "DEFECTIVE_ITEM",
  "WRONG_ITEM_SHIPPED",
  "ITEM_NOT_AS_DESCRIBED",
  "ITEM_DAMAGED_IN_TRANSIT",
  "QUALITY_ISSUE",
  "LATE_DELIVERY",
]);

export function isSellerFaultReasonCode(reasonCode?: string | null) {
  return Boolean(reasonCode && SELLER_FAULT_REASON_CODES.has(reasonCode));
}

export function recalculateCommissionAfterRefund(params: {
  subtotalCents: number;
  commissionBps: number;
  cumulativeRefundedCents: number;
}) {
  const { subtotalCents, commissionBps, cumulativeRefundedCents } = params;
  const netRetainedSubtotalCents = Math.max(subtotalCents - cumulativeRefundedCents, 0);
  const commissionAfterCents = Math.round((netRetainedSubtotalCents * commissionBps) / 10000);
  return { commissionAfterCents };
}
