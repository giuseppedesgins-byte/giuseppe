import { getMarketplaceSettings } from "@/lib/settings";

/**
 * Reason codes that always qualify for a return/complaint regardless of Final Sale status
 * or the return window — "buyer protection" per spec Part 7: a seller can't use Final Sale
 * to avoid legitimate fulfillment responsibilities, and these aren't really "returns" so
 * much as "the order was wrong" claims.
 */
const BUYER_PROTECTION_REASON_CODES = new Set([
  "SUSPECTED_COUNTERFEIT",
  "WRONG_ITEM_SHIPPED",
  "ITEM_NOT_AS_DESCRIBED",
  "DEFECTIVE_ITEM",
  "ITEM_DAMAGED_IN_TRANSIT",
  "NEVER_ARRIVED",
  "MISSING_ITEM",
]);

/**
 * Reason codes where the SELLER is responsible for return shipping (spec Part 6). Not the
 * same list as the processor-fee-fault list in lib/pricing.ts — this is specifically about
 * who pays for the box going back, not who's at fault for the refund overall.
 */
const SELLER_PAYS_RETURN_SHIPPING = new Set([
  "DEFECTIVE_ITEM",
  "WRONG_ITEM_SHIPPED",
  "ITEM_NOT_AS_DESCRIBED",
  "ITEM_DAMAGED_IN_TRANSIT",
  "SUSPECTED_COUNTERFEIT",
  "MISSING_ITEM",
  "QUALITY_ISSUE",
]);

export function computeReturnShippingResponsibility(reasonCode?: string | null): "BUYER" | "SELLER" | "GIUSEPPE" {
  if (reasonCode && SELLER_PAYS_RETURN_SHIPPING.has(reasonCode)) return "SELLER";
  return "BUYER";
}

export function isBuyerProtectionReason(reasonCode?: string | null) {
  return Boolean(reasonCode && BUYER_PROTECTION_REASON_CODES.has(reasonCode));
}

/**
 * Whether a standard return can be started right now. Buyer-protection reasons (wrong,
 * defective, counterfeit, never arrived, missing item) are always eligible regardless of
 * Final Sale or the window — everything else needs: delivered, within the configured
 * return window, and not a Final Sale item.
 */
export async function isReturnEligible(params: {
  deliveredAt: Date | null;
  finalSale: boolean;
  reasonCode?: string | null;
}) {
  if (isBuyerProtectionReason(params.reasonCode)) return { eligible: true as const };

  if (!params.deliveredAt) {
    return { eligible: false as const, why: "This order hasn't been marked delivered yet." };
  }
  if (params.finalSale) {
    return { eligible: false as const, why: "This item is marked Final Sale and isn't eligible for a standard return." };
  }
  const settings = await getMarketplaceSettings();
  const windowMs = settings.returnWindowDays * 24 * 60 * 60 * 1000;
  const deadline = new Date(params.deliveredAt.getTime() + windowMs);
  if (new Date() > deadline) {
    return { eligible: false as const, why: `The ${settings.returnWindowDays}-day return window has passed.` };
  }
  return { eligible: true as const };
}
