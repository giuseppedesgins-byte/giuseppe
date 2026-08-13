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
