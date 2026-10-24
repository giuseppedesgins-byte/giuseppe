import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice, estimateProcessorFeeCents, variantLabel } from "@/lib/pricing";
import { emails } from "@/lib/email";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { logAudit } from "@/lib/audit";
import { recordSellerCausedCancellation, recordFulfilled } from "@/lib/performance";
import { requireSellerOwnsOrder, getSellerAccountByToken } from "@/lib/seller";
import { computeDeliveryFields, recordRefundReversal, recordProcessorFeeAdjustment, getSellerBalances } from "@/lib/ledger";
import { sweepOrders } from "@/lib/order-sweep";
import { createMembershipCheckoutSession, createMembershipBillingPortalSession } from "@/lib/membership";
import { createExpressAccountLink } from "@/lib/connect";

/**
 * Seller portal — see spec §16/§27: sellers can view their own orders, add tracking,
 * update fulfillment status, and cancel an order they can't fulfill (which immediately
 * refunds the customer in full and reverses Giuseppe's commission — see cancelOrder
 * below). Sellers still cannot publish products directly; see /seller/[token]/products
 * for the propose/review-gated product flow. Access is via an unguessable per-brand
 * token link (SellerAccount.portalToken) rather than a full login system for V1.
 */
async function updateOrder(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const orderId = String(formData.get("orderId"));
  const { order } = await requireSellerOwnsOrder(token, orderId);

  const trackingNumber = String(formData.get("trackingNumber") || "") || null;
  const trackingUrl = String(formData.get("trackingUrl") || "") || null;
  const carrier = String(formData.get("carrier") || "") || null;
  const fulfillmentStatus = formData.get("fulfillmentStatus") as any;

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      trackingNumber,
      trackingUrl,
      carrier,
      fulfillmentStatus,
      shippedAt: fulfillmentStatus === "SHIPPED" && !order.shippedAt ? new Date() : order.shippedAt,
      ...(await computeDeliveryFields(order.deliveredAt, fulfillmentStatus)),
    },
  });

  if (fulfillmentStatus === "SHIPPED" && trackingNumber) {
    await emails.shippingConfirmation(updated.email, updated.orderNumber, trackingNumber, trackingUrl);
  }
  if (fulfillmentStatus === "DELIVERED" && order.fulfillmentStatus !== "DELIVERED") {
    await recordFulfilled(order.brandId);
  }

  redirect(`/seller/${token}`);
}

const CANCELLABLE_ORDER_STATUSES = ["PAID", "PROCESSING"];

/**
 * Seller-initiated cancellation of an already-PAID order. This is distinct from marking a
 * product out-of-stock before a sale (no penalty) — cancelling a paid order is a recorded
 * seller-fault event: full refund, $0 commission retained, and it counts against the
 * seller's performance metrics (spec §13/§15/§23). Refund actually moves money via Stripe.
 */
async function cancelOrder(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const orderId = String(formData.get("orderId"));
  const reasonCode = String(formData.get("reasonCode") || "OTHER");
  const note = String(formData.get("note") || "");
  const { sellerAccount, order } = await requireSellerOwnsOrder(token, orderId);

  if (!CANCELLABLE_ORDER_STATUSES.includes(order.status)) {
    redirect(`/seller/${token}?cancelError=not-cancellable`);
  }

  if (order.stripePaymentIntentId && isStripeConfigured()) {
    // reverse_transfer/refund_application_fee only matter for orders routed to a connected
    // account via Stripe Connect (see lib/connect.ts) — Stripe ignores them harmlessly on
    // ordinary platform-only charges. Without these, refunding a Connect order would leave
    // the seller's transferred payout untouched while the customer is also refunded.
    await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      reverse_transfer: true,
      refund_application_fee: true,
    });
  }

  // A seller cancelling their own paid order is always seller-fault by definition, so the
  // processor-fee policy always applies here (see lib/pricing.ts) — no reason-code lookup
  // needed, unlike the admin refund flow where fault varies by reason.
  const commissionBefore = order.commissionCents;
  const processorFeeCents = order.processorFeeCents ?? estimateProcessorFeeCents(order.totalCents);
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED", refundedCents: order.totalCents, commissionCents: 0, processorFeeCents, sellerAmountCents: 0 },
  });

  await prisma.orderIssue.create({
    data: {
      orderId,
      type: "SELLER_CANCELLATION",
      reasonCode: reasonCode as any,
      status: "RESOLVED",
      description: note || null,
      sellerFault: true,
      initiatedBy: "SELLER",
      refundCents: order.totalCents,
      resolution: "Cancelled by seller; refunded in full.",
      resolvedByAdminId: null,
    },
  });

  await logAudit({
    entityType: "ORDER",
    entityId: orderId,
    action: "SELLER_CANCELLATION",
    previousStatus: order.status,
    newStatus: "CANCELLED",
    actorType: "SELLER",
    actorId: sellerAccount.id,
    actorLabel: sellerAccount.brand.name,
    reason: `${reasonCode}${note ? `: ${note}` : ""}`,
    amountCents: order.totalCents,
    commissionBeforeCents: commissionBefore,
    commissionAfterCents: 0,
    refundCents: order.totalCents,
    metadata: { processorFeeChargedToSellerCents: processorFeeCents },
  });

  await recordSellerCausedCancellation(order.brandId);
  await recordRefundReversal({ orderId, brandId: order.brandId, refundCents: order.totalCents, isFullRefund: true });
  await recordProcessorFeeAdjustment({ orderId, brandId: order.brandId, feeCents: processorFeeCents });
  await emails.orderCancelledBySeller(updated.email, updated.orderNumber, sellerAccount.brand.name, formatPrice(order.totalCents, order.currency));

  redirect(`/seller/${token}`);
}

/** Seller sets up (or first-time completes) recurring billing for their Giuseppe membership. */
async function startMembershipBilling(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const sellerAccount = await getSellerAccountByToken(token);
  const url = await createMembershipCheckoutSession(sellerAccount.brandId, token);
  redirect(url);
}

/** Stripe's own hosted UI for a seller to update their card or cancel membership billing. */
async function manageMembershipBilling(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const sellerAccount = await getSellerAccountByToken(token);
  const url = await createMembershipBillingPortalSession(sellerAccount.brandId, token);
  redirect(url ?? `/seller/${token}`);
}

/** Starts (or resumes) Stripe's hosted Express onboarding — see lib/connect.ts. */
async function connectBankAccount(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const sellerAccount = await getSellerAccountByToken(token);
  const url = await createExpressAccountLink(sellerAccount.brandId, token);
  redirect(url ?? `/seller/${token}?connectError=1`);
}

export default async function SellerPortalPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { cancelError?: string; billingSetup?: string; connectReturn?: string; connectError?: string };
}) {
  const sellerAccount = await prisma.sellerAccount.findUnique({
    where: { portalToken: params.token },
    include: {
      brand: {
        include: { orders: { include: { items: true }, orderBy: { createdAt: "desc" } }, membership: true },
      },
    },
  });
  if (!sellerAccount) notFound();

  await sweepOrders();
  const brand = sellerAccount.brand;
  const balances = await getSellerBalances(brand.id);
  const REASON_CODES = [
    "OUT_OF_STOCK_AFTER_PURCHASE",
    "UNABLE_TO_FULFILL",
    "PRICING_ERROR",
    "DUPLICATE_OR_ACCIDENTAL_ORDER",
    "OTHER",
  ];

  return (
    <div className="editorial-container py-14 sm:py-20">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <p className="eyebrow mb-3">Seller Portal</p>
          <h1 className="mb-2 font-display text-3xl">{brand.name}</h1>
          <p className="text-sm text-giuseppe-muted">
            Status: {brand.status} · Commission: {(brand.commissionBps / 100).toFixed(2)}% · Payout email: {sellerAccount.payoutEmail ?? "—"}
          </p>
        </div>
        <Link href={`/seller/${params.token}/products`} className="border border-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2">
          Manage products
        </Link>
      </div>

      {searchParams.cancelError === "not-cancellable" && (
        <p className="mb-6 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          This order can no longer be cancelled from here (it may already be shipped, refunded, or cancelled).
        </p>
      )}

      {searchParams.billingSetup && (
        <p className="mb-6 border border-giuseppe-line bg-white px-4 py-3 text-sm">
          Billing set up — thanks. You&rsquo;ll see your membership status reflected below shortly.
        </p>
      )}

      {searchParams.connectError && (
        <p className="mb-6 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          Couldn&rsquo;t start bank account setup — Stripe may not be configured yet. Contact Giuseppe.
        </p>
      )}

      <div className="mb-10 border border-giuseppe-line bg-white p-5">
        <p className="mb-2 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Payouts (bank account)</p>
        {sellerAccount.stripeOnboardingComplete ? (
          <p className="text-sm">
            Connected — Giuseppe pays you directly through Stripe for orders placed from now on. No action needed.
          </p>
        ) : (
          <>
            <p className="mb-3 text-sm text-giuseppe-muted">
              {sellerAccount.stripeAccountId
                ? "Almost there — Stripe still needs a bit more info to finish verifying your account."
                : "Connect a bank account so Giuseppe can pay you directly through Stripe instead of manual payouts."}
            </p>
            <form action={connectBankAccount}>
              <input type="hidden" name="token" value={params.token} />
              <button className="border border-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2">
                {sellerAccount.stripeAccountId ? "Finish setup" : "Connect your bank account"}
              </button>
            </form>
          </>
        )}
      </div>

      {brand.membership && (
        <div className="mb-10 border border-giuseppe-line bg-white p-5">
          <p className="mb-2 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Membership billing</p>
          <p className="mb-3 text-sm">
            {(brand.membership.monthlyPriceCents / 100).toFixed(2)}/mo · Status: {brand.membership.status.replace(/_/g, " ")}
            {brand.membership.status === "TRIAL" && brand.membership.trialEndsAt && (
              <> · trial ends {brand.membership.trialEndsAt.toLocaleDateString()}</>
            )}
          </p>
          {brand.membership.stripeSubscriptionId ? (
            <form action={manageMembershipBilling}>
              <input type="hidden" name="token" value={params.token} />
              <button className="border border-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2">
                Manage billing / update card
              </button>
            </form>
          ) : (
            <>
              <p className="mb-3 text-xs text-giuseppe-muted">
                No payment method on file yet.{" "}
                {brand.membership.status === "TRIAL"
                  ? "You won't be charged until your trial ends — set this up now so billing doesn't lapse."
                  : "Set up billing to keep your membership active."}
              </p>
              <form action={startMembershipBilling}>
                <input type="hidden" name="token" value={params.token} />
                <button className="border border-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2">
                  Set up billing
                </button>
              </form>
            </>
          )}
        </div>
      )}

      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <BalanceStat label="Pending" cents={balances.pendingCents} currency="usd" />
        <BalanceStat label="Available" cents={balances.availableCents} currency="usd" />
        <BalanceStat label="Paid out" cents={-balances.paidOutCents} currency="usd" />
        <BalanceStat label="Refunded/reversed" cents={balances.reversedCents} currency="usd" />
      </div>
      <p className="mb-10 text-xs text-giuseppe-muted">
        Pending funds become available after Giuseppe&rsquo;s post-delivery review window, assuming there&rsquo;s no open
        case on the order. Payout issuance is still handled directly by Giuseppe outside this portal for now — see your
        Seller Agreement.
      </p>

      <h2 className="mb-6 font-display text-xl">Orders</h2>
      <div className="space-y-6">
        {brand.orders.map((o) => (
          <div key={o.id} className="border border-giuseppe-line bg-white p-5">
            <div className="mb-3 flex items-center justify-between text-sm">
              <p>{o.orderNumber} — {o.email}</p>
              <p className="text-xs uppercase tracking-widest2 text-giuseppe-muted">{o.status} / {o.fulfillmentStatus}</p>
            </div>
            <div className="mb-3 text-xs text-giuseppe-muted">
              {o.items.map((i) => (
                <p key={i.id}>
                  {i.productName}
                  {variantLabel(i.options)} × {i.quantity}
                </p>
              ))}
              <p className="mt-1">Your payout: {formatPrice(o.sellerAmountCents, o.currency)}</p>
            </div>
            <form action={updateOrder} className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <input type="hidden" name="token" value={params.token} />
              <input type="hidden" name="orderId" value={o.id} />
              <select name="fulfillmentStatus" defaultValue={o.fulfillmentStatus} className="border border-giuseppe-line px-2 py-1 text-xs">
                <option value="UNFULFILLED">Unfulfilled</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="RETURNED">Returned</option>
              </select>
              <input name="carrier" placeholder="Carrier" defaultValue={o.carrier ?? ""} className="border border-giuseppe-line px-2 py-1 text-xs" />
              <input name="trackingNumber" placeholder="Tracking #" defaultValue={o.trackingNumber ?? ""} className="border border-giuseppe-line px-2 py-1 text-xs" />
              <input name="trackingUrl" placeholder="Tracking URL" defaultValue={o.trackingUrl ?? ""} className="border border-giuseppe-line px-2 py-1 text-xs" />
              <button className="border border-giuseppe-ink px-2 py-1 text-xs uppercase tracking-widest2">Save</button>
            </form>

            {CANCELLABLE_ORDER_STATUSES.includes(o.status) && (
              <details className="border-t border-giuseppe-line pt-3">
                <summary className="cursor-pointer text-xs uppercase tracking-widest2 text-red-700">Can&rsquo;t fulfill this order?</summary>
                <form action={cancelOrder} className="mt-3 space-y-2">
                  <input type="hidden" name="token" value={params.token} />
                  <input type="hidden" name="orderId" value={o.id} />
                  <p className="text-xs text-giuseppe-muted">
                    This refunds the customer in full immediately and is recorded as a seller-caused cancellation.
                  </p>
                  <select name="reasonCode" required className="w-full border border-giuseppe-line px-2 py-1 text-xs">
                    {REASON_CODES.map((code) => (
                      <option key={code} value={code}>
                        {code.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <textarea name="note" placeholder="Details (optional)" rows={2} className="w-full border border-giuseppe-line px-2 py-1 text-xs" />
                  <button className="w-full border border-red-700 px-3 py-1.5 text-xs uppercase tracking-widest2 text-red-700 hover:bg-red-700 hover:text-white">
                    Cancel order &amp; refund customer
                  </button>
                </form>
              </details>
            )}
          </div>
        ))}
        {brand.orders.length === 0 && <p className="text-sm text-giuseppe-muted">No orders yet.</p>}
      </div>
    </div>
  );
}

function BalanceStat({ label, cents, currency }: { label: string; cents: number; currency: string }) {
  return (
    <div className="border border-giuseppe-line bg-white p-4">
      <p className="font-display text-xl">{formatPrice(cents, currency)}</p>
      <p className="mt-1 text-[10px] uppercase tracking-widest2 text-giuseppe-muted">{label}</p>
    </div>
  );
}
