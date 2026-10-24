import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSystemAdmin } from "@/lib/admin-helpers";
import { formatPrice, bpsToPercentLabel, recalculateCommissionAfterRefund, estimateProcessorFeeCents, isSellerFaultReasonCode, variantLabel } from "@/lib/pricing";
import { emails } from "@/lib/email";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { logAudit } from "@/lib/audit";
import { recordRefund } from "@/lib/performance";
import { computeDeliveryFields, recordRefundReversal, recordProcessorFeeAdjustment } from "@/lib/ledger";

const REASON_CODES = [
  "CUSTOMER_CHANGED_MIND",
  "CUSTOMER_ORDERED_WRONG_ITEM",
  "DEFECTIVE_ITEM",
  "WRONG_ITEM_SHIPPED",
  "ITEM_NOT_AS_DESCRIBED",
  "ITEM_DAMAGED_IN_TRANSIT",
  "NEVER_ARRIVED",
  "LOST_IN_TRANSIT",
  "LATE_DELIVERY",
  "DUPLICATE_ORDER",
  "PRICING_ERROR",
  "SIZE_FIT_ISSUE",
  "QUALITY_ISSUE",
  "OTHER",
];

async function updateFulfillment(formData: FormData) {
  "use server";
  requireAdmin();
  const id = String(formData.get("id"));
  const trackingNumber = String(formData.get("trackingNumber") || "") || null;
  const trackingUrl = String(formData.get("trackingUrl") || "") || null;
  const carrier = String(formData.get("carrier") || "") || null;
  const fulfillmentStatus = formData.get("fulfillmentStatus") as any;
  const status = formData.get("status") as any;

  const existing = await prisma.order.findUniqueOrThrow({ where: { id } });
  const order = await prisma.order.update({
    where: { id },
    data: {
      trackingNumber,
      trackingUrl,
      carrier,
      fulfillmentStatus,
      status,
      shippedAt: fulfillmentStatus === "SHIPPED" && !existing.shippedAt ? new Date() : existing.shippedAt,
      ...(await computeDeliveryFields(existing.deliveredAt, fulfillmentStatus)),
    },
  });

  if (fulfillmentStatus === "SHIPPED" && trackingNumber) {
    await emails.shippingConfirmation(order.email, order.orderNumber, trackingNumber, trackingUrl);
  }

  redirect(`/admin/orders/${id}`);
}

/**
 * Full or partial refund. Giuseppe does not retain commission on the refunded portion —
 * commission is recalculated as commissionBps% of whatever's left of the product subtotal
 * after this (and any prior) refund (see lib/pricing.ts recalculateCommissionAfterRefund,
 * spec's $100/$20/$80/$7.20 example). Actually moves money via Stripe and is kept in sync
 * with refunds issued directly in Stripe via the refund.updated webhook. Every refund is
 * required to carry a reason code, permanently recorded on an OrderIssue + AuditLogEntry —
 * no refund happens without one.
 */
async function refundOrder(formData: FormData) {
  "use server";
  requireAdmin();
  const id = String(formData.get("id"));
  const reasonCode = String(formData.get("reasonCode") || "OTHER");
  const note = String(formData.get("note") || "");
  const admin = await getSystemAdmin();
  const order = await prisma.order.findUniqueOrThrow({ where: { id } });

  if (!order.stripePaymentIntentId) {
    redirect(`/admin/orders/${id}?refundError=no-payment`);
  }

  const remainingCents = order.totalCents - order.refundedCents;
  const requestedRaw = String(formData.get("amount") || "");
  const requestedCents = requestedRaw ? Math.round(Number(requestedRaw) * 100) : remainingCents;
  const refundCents = Math.max(0, Math.min(requestedCents, remainingCents));

  if (refundCents <= 0) {
    redirect(`/admin/orders/${id}?refundError=invalid-amount`);
  }

  if (isStripeConfigured()) {
    // See seller/[token]/page.tsx cancelOrder for why reverse_transfer/
    // refund_application_fee are always included — no-ops on non-Connect orders.
    await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      amount: refundCents,
      reverse_transfer: true,
      refund_application_fee: true,
    });
  }

  const cumulativeRefundedCents = order.refundedCents + refundCents;
  const isFullRefund = cumulativeRefundedCents >= order.totalCents;
  const { commissionAfterCents } = recalculateCommissionAfterRefund({
    subtotalCents: order.subtotalCents,
    commissionBps: order.commissionBps,
    cumulativeRefundedCents,
  });

  // Processor-fee policy: the seller absorbs Stripe's non-refundable processing fee only
  // when the refund reason is the seller's fault (see lib/pricing.ts). Charged once per
  // order, on the first seller-fault refund — a second refund on the same order doesn't
  // stack a second fee.
  const newProcessorFeeCents =
    order.processorFeeCents ?? (isSellerFaultReasonCode(reasonCode) ? estimateProcessorFeeCents(order.totalCents) : 0);

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: isFullRefund ? "REFUNDED" : order.status,
      refundedCents: cumulativeRefundedCents,
      commissionCents: commissionAfterCents,
      processorFeeCents: newProcessorFeeCents,
      sellerAmountCents: order.totalCents - cumulativeRefundedCents - commissionAfterCents - newProcessorFeeCents,
    },
  });

  await prisma.orderIssue.create({
    data: {
      orderId: id,
      type: "REFUND_REQUEST",
      reasonCode: reasonCode as any,
      status: "RESOLVED",
      description: note || null,
      initiatedBy: "ADMIN",
      refundCents: refundCents,
      resolution: `${isFullRefund ? "Full" : "Partial"} refund issued by Giuseppe.`,
      resolvedByAdminId: admin.id,
    },
  });

  await logAudit({
    entityType: "ORDER",
    entityId: id,
    action: isFullRefund ? "REFUND_FULL" : "REFUND_PARTIAL",
    previousStatus: order.status,
    newStatus: updated.status,
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.name,
    reason: `${reasonCode}${note ? `: ${note}` : ""}`,
    amountCents: refundCents,
    commissionBeforeCents: order.commissionCents,
    commissionAfterCents,
    refundCents: refundCents,
    metadata: newProcessorFeeCents > (order.processorFeeCents ?? 0) ? { processorFeeChargedToSellerCents: newProcessorFeeCents } : undefined,
  });

  await recordRefund(order.brandId);
  await recordRefundReversal({ orderId: id, brandId: order.brandId, refundCents, isFullRefund });
  if (newProcessorFeeCents > (order.processorFeeCents ?? 0)) {
    await recordProcessorFeeAdjustment({ orderId: id, brandId: order.brandId, feeCents: newProcessorFeeCents });
  }
  await emails.orderRefunded(updated.email, updated.orderNumber, formatPrice(refundCents, updated.currency), !isFullRefund);

  redirect(`/admin/orders/${id}`);
}

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { refundError?: string };
}) {
  requireAdmin();
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { brand: true, items: true, issues: { orderBy: { createdAt: "desc" } } },
  });
  if (!order) notFound();

  const remainingCents = order.totalCents - order.refundedCents;
  const canRefund = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status) && Boolean(order.stripePaymentIntentId) && remainingCents > 0;
  const address = order.shippingAddress as any;

  const auditLog = await prisma.auditLogEntry.findMany({
    where: { entityType: "ORDER", entityId: order.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl space-y-10">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow mb-2">{order.brand.name}</p>
          <h1 className="font-display text-3xl">{order.orderNumber}</h1>
        </div>
        {order.refundedCents > 0 && (
          <span className="border border-giuseppe-line px-3 py-1 text-xs uppercase tracking-widest2 text-giuseppe-muted">
            {order.status === "REFUNDED" ? "Refunded" : "Partially refunded"}
          </span>
        )}
      </div>

      {searchParams.refundError === "no-payment" && (
        <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          Couldn&rsquo;t refund — this order has no linked Stripe payment (likely a test order created before Stripe was configured).
        </p>
      )}
      {searchParams.refundError === "invalid-amount" && (
        <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          That refund amount isn&rsquo;t valid — it must be more than $0 and no more than what&rsquo;s left on the order.
        </p>
      )}

      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
        <div className="space-y-4 border border-giuseppe-line bg-white p-6 text-sm">
          <p className="text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Order</p>
          <p>Customer: {order.email}</p>
          <p>
            Ship to: {address?.name}, {address?.address1} {address?.address2}, {address?.city} {address?.region} {address?.postalCode}, {address?.country}
          </p>
          <p>Shipping method: {order.shippingMethod}</p>
          <div className="border-t border-giuseppe-line pt-3">
            {order.items.map((i) => (
              <p key={i.id}>
                {i.productName}{variantLabel(i.options)} × {i.quantity} — {formatPrice(i.unitPriceCents * i.quantity, order.currency)}
              </p>
            ))}
          </div>
          <div className="border-t border-giuseppe-line pt-3">
            <p>Subtotal: {formatPrice(order.subtotalCents, order.currency)}</p>
            <p>Shipping: {formatPrice(order.shippingCostCents, order.currency)}</p>
            {order.taxCents > 0 && <p>Tax: {formatPrice(order.taxCents, order.currency)}</p>}
            <p>Total: {formatPrice(order.totalCents, order.currency)}</p>
            {order.refundedCents > 0 && <p className="text-red-700">Refunded so far: {formatPrice(order.refundedCents, order.currency)}</p>}
            <p className="mt-2 text-giuseppe-muted">
              Giuseppe commission ({bpsToPercentLabel(order.commissionBps)} rate) — current: {formatPrice(order.commissionCents, order.currency)}
            </p>
            <p className="text-giuseppe-muted">Seller payout: {formatPrice(order.sellerAmountCents, order.currency)}</p>
          </div>
        </div>

        <form action={updateFulfillment} className="space-y-4 border border-giuseppe-line bg-white p-6">
          <input type="hidden" name="id" value={order.id} />
          <p className="text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Fulfillment</p>
          <label className="block">
            <span className="mb-1 block text-xs text-giuseppe-muted">Order status</span>
            <select name="status" defaultValue={order.status} className="w-full border border-giuseppe-line px-3 py-2 text-sm">
              <option value="PENDING_PAYMENT">Pending payment</option>
              <option value="PAID">Paid</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
              <option value="EXPIRED">Expired (never paid)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-giuseppe-muted">Fulfillment status</span>
            <select name="fulfillmentStatus" defaultValue={order.fulfillmentStatus} className="w-full border border-giuseppe-line px-3 py-2 text-sm">
              <option value="UNFULFILLED">Unfulfilled</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="RETURNED">Returned</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-giuseppe-muted">Carrier</span>
            <input name="carrier" defaultValue={order.carrier ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-giuseppe-muted">Tracking number</span>
            <input name="trackingNumber" defaultValue={order.trackingNumber ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-giuseppe-muted">Tracking URL</span>
            <input name="trackingUrl" defaultValue={order.trackingUrl ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
          <button className="w-full bg-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">Save</button>
        </form>
      </div>

      {canRefund && (
        <div className="max-w-sm space-y-3 border border-giuseppe-line bg-white p-6">
          <p className="text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Refund</p>
          <p className="text-sm text-giuseppe-muted">
            Up to {formatPrice(remainingCents, order.currency)} available to refund. Giuseppe&rsquo;s commission is
            automatically recalculated on the refunded amount — full refund means $0 commission retained. This cannot be
            undone.
          </p>
          <form action={refundOrder} className="space-y-3">
            <input type="hidden" name="id" value={order.id} />
            <label className="block">
              <span className="mb-1 block text-xs text-giuseppe-muted">Amount (USD) — leave blank for full remaining amount</span>
              <input name="amount" type="number" step="0.01" min="0.01" max={(remainingCents / 100).toFixed(2)} placeholder={(remainingCents / 100).toFixed(2)} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-giuseppe-muted">Reason code (required, kept on permanent record)</span>
              <select name="reasonCode" required className="w-full border border-giuseppe-line px-3 py-2 text-sm">
                {REASON_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <textarea name="note" placeholder="Notes (optional)" rows={2} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
            <button className="w-full border border-red-700 px-4 py-2 text-[11px] uppercase tracking-widest2 text-red-700 hover:bg-red-700 hover:text-white">
              Issue refund
            </button>
          </form>
        </div>
      )}

      {order.issues.length > 0 && (
        <div className="border border-giuseppe-line bg-white p-6">
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Cases on this order</p>
          <div className="space-y-2 text-xs">
            {order.issues.map((iss) => (
              <p key={iss.id} className="border-t border-giuseppe-line pt-2 text-giuseppe-muted">
                {iss.createdAt.toLocaleString()} — {iss.type.replace(/_/g, " ")}
                {iss.reasonCode ? ` (${iss.reasonCode.replace(/_/g, " ")})` : ""} · {iss.status}
                {iss.refundCents ? ` · ${formatPrice(iss.refundCents, order.currency)} refunded` : ""}
              </p>
            ))}
          </div>
        </div>
      )}

      {auditLog.length > 0 && (
        <div className="border border-giuseppe-line bg-white p-6">
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">History</p>
          <div className="space-y-2 text-xs">
            {auditLog.map((a) => (
              <p key={a.id} className="border-t border-giuseppe-line pt-2 text-giuseppe-muted">
                {a.createdAt.toLocaleString()} — {a.action.replace(/_/g, " ")} by {a.actorLabel ?? a.actorType}
                {a.reason ? `: ${a.reason}` : ""}
                {a.refundCents ? ` (${formatPrice(a.refundCents, order.currency)})` : ""}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
