import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSystemAdmin } from "@/lib/admin-helpers";
import { formatPrice, recalculateCommissionAfterRefund, estimateProcessorFeeCents } from "@/lib/pricing";
import { emails } from "@/lib/email";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { logAudit } from "@/lib/audit";
import { recordRefund, recordComplaint } from "@/lib/performance";
import { recordRefundReversal, recordProcessorFeeAdjustment } from "@/lib/ledger";

async function updateStatus(formData: FormData) {
  "use server";
  requireAdmin();
  const id = String(formData.get("id"));
  const status = formData.get("status") as any;
  const admin = await getSystemAdmin();
  const issue = await prisma.orderIssue.findUniqueOrThrow({ where: { id }, include: { order: true } });

  await prisma.orderIssue.update({ where: { id }, data: { status } });
  await logAudit({
    entityType: "ORDER",
    entityId: issue.orderId,
    action: "ISSUE_STATUS_CHANGE",
    previousStatus: issue.status,
    newStatus: status,
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.name,
  });
  await emails.issueUpdate(issue.order.email, issue.order.orderNumber, status.replace(/_/g, " "));

  redirect(`/admin/issues/${id}`);
}

/**
 * Every case is closed out through this one action — it doubles as the "Giuseppe
 * Override" function (spec §21/24): a resolution note and fault determination are always
 * required, an optional refund can be attached (using the same partial-refund/commission-
 * recalculation logic as /admin/orders/[id]), and it's always attributed to the admin who
 * made the call with a timestamp — there's no code path that resolves a case silently.
 */
async function resolveCase(formData: FormData) {
  "use server";
  requireAdmin();
  const id = String(formData.get("id"));
  const resolution = String(formData.get("resolution") || "");
  const faultRaw = String(formData.get("sellerFault") || "unknown");
  const sellerFault = faultRaw === "true" ? true : faultRaw === "false" ? false : null;
  const admin = await getSystemAdmin();

  if (!resolution.trim()) redirect(`/admin/issues/${id}?error=resolution-required`);

  const issue = await prisma.orderIssue.findUniqueOrThrow({ where: { id }, include: { order: true } });
  const order = issue.order;

  const amountRaw = String(formData.get("refundAmount") || "");
  let refundCents = 0;
  if (amountRaw) {
    refundCents = Math.round(Number(amountRaw) * 100);
    const remainingCents = order.totalCents - order.refundedCents;
    refundCents = Math.max(0, Math.min(refundCents, remainingCents));

    if (refundCents > 0) {
      if (!order.stripePaymentIntentId) redirect(`/admin/issues/${id}?error=no-payment`);
      if (isStripeConfigured()) {
        // See seller/[token]/page.tsx cancelOrder for why reverse_transfer/
        // refund_application_fee are always included — no-ops on non-Connect orders.
        await stripe.refunds.create({
          payment_intent: order.stripePaymentIntentId!,
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
      // Here the admin has already made an explicit fault determination for this case
      // (sellerFault below) — more authoritative than the reason-code heuristic used in
      // the plain /admin/orders/[id] refund flow, so it's used directly.
      const processorFeeCents =
        order.processorFeeCents ?? (sellerFault ? estimateProcessorFeeCents(order.totalCents) : 0);
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: isFullRefund ? "REFUNDED" : order.status,
          refundedCents: cumulativeRefundedCents,
          commissionCents: commissionAfterCents,
          processorFeeCents,
          sellerAmountCents: order.totalCents - cumulativeRefundedCents - commissionAfterCents - processorFeeCents,
        },
      });
      await recordRefund(order.brandId);
      await recordRefundReversal({ orderId: order.id, brandId: order.brandId, refundCents, isFullRefund });
      if (processorFeeCents > (order.processorFeeCents ?? 0)) {
        await recordProcessorFeeAdjustment({ orderId: order.id, brandId: order.brandId, feeCents: processorFeeCents });
      }
      await emails.orderRefunded(order.email, order.orderNumber, formatPrice(refundCents, order.currency), !isFullRefund);
    }
  }

  await prisma.orderIssue.update({
    where: { id },
    data: { status: "RESOLVED", resolution, sellerFault, refundCents: refundCents || issue.refundCents, resolvedByAdminId: admin.id },
  });

  if (sellerFault) await recordComplaint(order.brandId);

  await logAudit({
    entityType: "ORDER",
    entityId: order.id,
    action: "GIUSEPPE_OVERRIDE_RESOLVE_CASE",
    previousStatus: issue.status,
    newStatus: "RESOLVED",
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.name,
    reason: resolution,
    refundCents: refundCents || null,
    metadata: { sellerFault, issueId: id },
  });

  await emails.issueUpdate(order.email, order.orderNumber, "Resolved", resolution);

  redirect(`/admin/issues/${id}`);
}

// ---------- Return-specific actions (only meaningful when issue.type === RETURN_REQUEST) ----------

async function approveReturn(formData: FormData) {
  "use server";
  requireAdmin();
  const id = String(formData.get("id"));
  const admin = await getSystemAdmin();
  const issue = await prisma.orderIssue.findUniqueOrThrow({ where: { id }, include: { order: true } });

  await prisma.orderIssue.update({
    where: { id },
    data: { status: "AWAITING_CUSTOMER", returnShipmentStatus: "AWAITING_SHIPMENT" },
  });
  await logAudit({
    entityType: "ORDER",
    entityId: issue.orderId,
    action: "RETURN_APPROVED",
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.name,
  });
  await emails.issueUpdate(issue.order.email, issue.order.orderNumber, "Return approved — instructions on the way");

  redirect(`/admin/issues/${id}`);
}

async function denyReturn(formData: FormData) {
  "use server";
  requireAdmin();
  const id = String(formData.get("id"));
  const note = String(formData.get("note") || "");
  const admin = await getSystemAdmin();
  const issue = await prisma.orderIssue.findUniqueOrThrow({ where: { id }, include: { order: true } });

  if (!note.trim()) redirect(`/admin/issues/${id}?error=resolution-required`);

  await prisma.orderIssue.update({
    where: { id },
    data: { status: "RESOLVED", resolution: note, resolvedByAdminId: admin.id, sellerFault: false },
  });
  await logAudit({
    entityType: "ORDER",
    entityId: issue.orderId,
    action: "RETURN_DENIED",
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.name,
    reason: note,
  });
  await emails.issueUpdate(issue.order.email, issue.order.orderNumber, "Return request denied", note);

  redirect(`/admin/issues/${id}`);
}

async function updateReturnShipment(formData: FormData) {
  "use server";
  requireAdmin();
  const id = String(formData.get("id"));
  const returnShipmentStatus = formData.get("returnShipmentStatus") as any;
  const returnTrackingNumber = String(formData.get("returnTrackingNumber") || "") || null;
  const returnCarrier = String(formData.get("returnCarrier") || "") || null;
  const returnTrackingUrl = String(formData.get("returnTrackingUrl") || "") || null;
  const admin = await getSystemAdmin();
  const issue = await prisma.orderIssue.findUniqueOrThrow({ where: { id }, include: { order: true } });

  await prisma.orderIssue.update({
    where: { id },
    data: {
      returnShipmentStatus,
      returnTrackingNumber,
      returnCarrier,
      returnTrackingUrl,
      // Once the return is back and inspected, the case moves off "awaiting customer" so
      // it shows up as needing Giuseppe/seller attention again.
      status: returnShipmentStatus === "INSPECTION_PENDING" || returnShipmentStatus === "DELIVERED" ? "AWAITING_SELLER" : issue.status,
    },
  });
  await logAudit({
    entityType: "ORDER",
    entityId: issue.orderId,
    action: "RETURN_SHIPMENT_UPDATE",
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.name,
    newStatus: returnShipmentStatus,
  });

  redirect(`/admin/issues/${id}`);
}

// ---------- Payout holds ----------

async function placeHold(formData: FormData) {
  "use server";
  requireAdmin();
  const brandId = String(formData.get("brandId"));
  const orderId = String(formData.get("orderId") || "") || null;
  const scope = String(formData.get("scope") || "order");
  const reason = String(formData.get("reason") || "");
  const issueId = String(formData.get("issueId"));
  const admin = await getSystemAdmin();

  if (!reason.trim()) redirect(`/admin/issues/${issueId}?error=hold-reason-required`);

  await prisma.payoutHold.create({
    data: {
      brandId,
      orderId: scope === "brand" ? null : orderId,
      reason,
      placedByAdminId: admin.id,
    },
  });
  await logAudit({
    entityType: "ORDER",
    entityId: orderId ?? brandId,
    action: scope === "brand" ? "PAYOUT_HOLD_PLACED_BRAND_WIDE" : "PAYOUT_HOLD_PLACED",
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.name,
    reason,
  });

  redirect(`/admin/issues/${issueId}`);
}

async function releaseHold(formData: FormData) {
  "use server";
  requireAdmin();
  const holdId = String(formData.get("holdId"));
  const issueId = String(formData.get("issueId"));
  const admin = await getSystemAdmin();
  const hold = await prisma.payoutHold.update({
    where: { id: holdId },
    data: { status: "RELEASED", releasedByAdminId: admin.id, releasedAt: new Date() },
  });
  await logAudit({
    entityType: "ORDER",
    entityId: hold.orderId ?? hold.brandId,
    action: "PAYOUT_HOLD_RELEASED",
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.name,
  });

  redirect(`/admin/issues/${issueId}`);
}

// ---------- Case messaging ----------

async function postMessage(formData: FormData) {
  "use server";
  requireAdmin();
  const issueId = String(formData.get("issueId"));
  const message = String(formData.get("message") || "");
  const internal = formData.get("internal") === "on";
  const admin = await getSystemAdmin();

  if (!message.trim()) redirect(`/admin/issues/${issueId}`);

  await prisma.caseMessage.create({
    data: { issueId, senderType: "ADMIN", senderLabel: admin.name, message, internal },
  });

  if (!internal) {
    const issue = await prisma.orderIssue.findUniqueOrThrow({ where: { id: issueId }, include: { order: true } });
    await emails.issueUpdate(issue.order.email, issue.order.orderNumber, "New message on your case", message);
  }

  redirect(`/admin/issues/${issueId}`);
}

// ---------- Counterfeit: hide/restore the product(s) on this order ----------

async function hideProduct(formData: FormData) {
  "use server";
  requireAdmin();
  const productId = String(formData.get("productId"));
  const issueId = String(formData.get("issueId"));
  const admin = await getSystemAdmin();
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  await prisma.product.update({ where: { id: productId }, data: { status: "ARCHIVED" } });
  await logAudit({
    entityType: "PRODUCT",
    entityId: productId,
    action: "HIDE_PRODUCT_COUNTERFEIT_REPORT",
    previousStatus: product.status,
    newStatus: "ARCHIVED",
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.name,
    metadata: { issueId },
  });

  redirect(`/admin/issues/${issueId}`);
}

async function restoreProduct(formData: FormData) {
  "use server";
  requireAdmin();
  const productId = String(formData.get("productId"));
  const issueId = String(formData.get("issueId"));
  const admin = await getSystemAdmin();
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  await prisma.product.update({ where: { id: productId }, data: { status: "LIVE" } });
  await logAudit({
    entityType: "PRODUCT",
    entityId: productId,
    action: "RESTORE_PRODUCT",
    previousStatus: product.status,
    newStatus: "LIVE",
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.name,
    metadata: { issueId },
  });

  redirect(`/admin/issues/${issueId}`);
}

export default async function AdminIssueDetailPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  requireAdmin();
  const issue = await prisma.orderIssue.findUnique({
    where: { id: params.id },
    include: { order: { include: { brand: true, items: { include: { product: true } } } }, resolvedByAdmin: true, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!issue) notFound();

  const [holds, relatedIssues] = await Promise.all([
    prisma.payoutHold.findMany({ where: { brandId: issue.order.brandId }, orderBy: { placedAt: "desc" }, include: { placedByAdmin: true, releasedByAdmin: true } }),
    prisma.orderIssue.findMany({ where: { orderId: issue.orderId, id: { not: issue.id } }, orderBy: { createdAt: "desc" } }),
  ]);

  const remainingCents = issue.order.totalCents - issue.order.refundedCents;

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow mb-2">{issue.order.brand.name} · {issue.order.orderNumber}</p>
          <h1 className="font-display text-3xl">{issue.type.replace(/_/g, " ")}</h1>
        </div>
        <a href={`/admin/brands/${issue.order.brandId}`} className="text-xs uppercase tracking-widest2 underline">
          Manage this seller
        </a>
      </div>

      {searchParams.error === "resolution-required" && (
        <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">A resolution note is required to close a case.</p>
      )}
      {searchParams.error === "no-payment" && (
        <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">This order has no linked Stripe payment to refund.</p>
      )}
      {searchParams.error === "hold-reason-required" && (
        <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">A reason is required to place a payout hold.</p>
      )}

      <div className="space-y-2 border border-giuseppe-line bg-white p-6 text-sm">
        <p>Status: <strong>{issue.status.replace(/_/g, " ")}</strong> · Priority: <strong>{issue.priority}</strong></p>
        <p>Reason code: {issue.reasonCode?.replace(/_/g, " ") ?? "—"}</p>
        <p>Initiated by: {issue.initiatedBy}</p>
        {issue.respondByAt && <p>Seller response due: {issue.respondByAt.toLocaleDateString()}</p>}
        <p>Order total: {formatPrice(issue.order.totalCents, issue.order.currency)} · Refunded so far: {formatPrice(issue.order.refundedCents, issue.order.currency)}</p>
        {issue.type === "RETURN_REQUEST" && (
          <p>
            Return shipment: {issue.returnShipmentStatus?.replace(/_/g, " ") ?? "—"} · Shipping paid by:{" "}
            {issue.returnShippingResponsibility ?? "—"}
            {issue.finalSaleAtPurchase && " · Final Sale at time of purchase"}
          </p>
        )}
        {relatedIssues.length > 0 && (
          <p className="text-giuseppe-muted">
            {relatedIssues.length} other case{relatedIssues.length > 1 ? "s" : ""} on this order.
          </p>
        )}
        {issue.description && <p className="border-t border-giuseppe-line pt-3">Description: {issue.description}</p>}
        {issue.customerEvidenceUrls.length > 0 && (
          <div className="border-t border-giuseppe-line pt-3">
            <p className="mb-2 text-xs uppercase tracking-widest2 text-giuseppe-muted">Customer evidence</p>
            <div className="grid grid-cols-4 gap-2">
              {issue.customerEvidenceUrls.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="" className="aspect-square w-full object-cover" />
              ))}
            </div>
          </div>
        )}
        {issue.sellerResponse && (
          <div className="border-t border-giuseppe-line pt-3">
            <p className="text-xs uppercase tracking-widest2 text-giuseppe-muted">Seller response</p>
            <p>{issue.sellerResponse}</p>
          </div>
        )}
        {issue.resolution && (
          <div className="border-t border-giuseppe-line pt-3">
            <p className="text-xs uppercase tracking-widest2 text-giuseppe-muted">Resolution</p>
            <p>{issue.resolution}</p>
            {issue.resolvedByAdmin && <p className="text-xs text-giuseppe-muted">— {issue.resolvedByAdmin.name}</p>}
          </div>
        )}
      </div>

      {issue.type === "RETURN_REQUEST" &&
        issue.status === "AWAITING_SELLER" &&
        issue.returnShipmentStatus !== "INSPECTION_PASSED" &&
        issue.returnShipmentStatus !== "INSPECTION_FAILED" && (
        <div className="space-y-4 border border-giuseppe-line bg-white p-6">
          <p className="text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Return request</p>
          {issue.returnShipmentStatus === "NOT_STARTED" && (
            <div className="flex gap-2">
              <form action={approveReturn} className="flex-1">
                <input type="hidden" name="id" value={issue.id} />
                <button className="w-full bg-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">Approve return</button>
              </form>
              <form action={denyReturn} className="flex-1 space-y-2">
                <input type="hidden" name="id" value={issue.id} />
                <input name="note" placeholder="Reason for denial" required className="w-full border border-giuseppe-line px-2 py-2 text-xs" />
                <button className="w-full border border-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2">Deny return</button>
              </form>
            </div>
          )}
          {issue.returnShipmentStatus && issue.returnShipmentStatus !== "NOT_STARTED" && (
            <form action={updateReturnShipment} className="space-y-2">
              <input type="hidden" name="id" value={issue.id} />
              <div className="grid grid-cols-2 gap-2">
                <input name="returnCarrier" placeholder="Carrier" defaultValue={issue.returnCarrier ?? ""} className="border border-giuseppe-line px-2 py-1 text-xs" />
                <input name="returnTrackingNumber" placeholder="Tracking #" defaultValue={issue.returnTrackingNumber ?? ""} className="border border-giuseppe-line px-2 py-1 text-xs" />
              </div>
              <input name="returnTrackingUrl" placeholder="Tracking URL" defaultValue={issue.returnTrackingUrl ?? ""} className="w-full border border-giuseppe-line px-2 py-1 text-xs" />
              <select name="returnShipmentStatus" defaultValue={issue.returnShipmentStatus} className="w-full border border-giuseppe-line px-2 py-1 text-xs">
                <option value="AWAITING_SHIPMENT">Awaiting shipment</option>
                <option value="IN_TRANSIT">In transit</option>
                <option value="DELIVERED">Delivered back to seller</option>
                <option value="INSPECTION_PENDING">Inspection pending</option>
                <option value="INSPECTION_PASSED">Inspection passed</option>
                <option value="INSPECTION_FAILED">Inspection failed</option>
              </select>
              <button className="w-full border border-giuseppe-ink px-3 py-1.5 text-xs uppercase tracking-widest2">Update return shipment</button>
            </form>
          )}
          <p className="text-xs text-giuseppe-muted">
            Once inspection passes, use &ldquo;Resolve this case&rdquo; below to issue the refund and close it out.
          </p>
        </div>
      )}

      {issue.status !== "RESOLVED" && issue.status !== "CLOSED" && (
        <>
          <form action={updateStatus} className="flex gap-2 border border-giuseppe-line bg-white p-6">
            <input type="hidden" name="id" value={issue.id} />
            <select name="status" defaultValue={issue.status} className="flex-1 border border-giuseppe-line px-3 py-2 text-sm">
              <option value="OPEN">Open</option>
              <option value="AWAITING_SELLER">Awaiting seller</option>
              <option value="AWAITING_CUSTOMER">Awaiting customer</option>
              <option value="ESCALATED">Escalated</option>
            </select>
            <button className="border border-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2">Update</button>
          </form>

          <form action={resolveCase} className="space-y-4 border border-giuseppe-line bg-white p-6">
            <p className="text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Resolve this case (Giuseppe override)</p>
            <input type="hidden" name="id" value={issue.id} />
            <label className="block">
              <span className="mb-1 block text-xs text-giuseppe-muted">Fault determination</span>
              <select name="sellerFault" className="w-full border border-giuseppe-line px-3 py-2 text-sm">
                <option value="unknown">Unable to determine</option>
                <option value="true">Seller at fault</option>
                <option value="false">Not seller fault</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-giuseppe-muted">Refund amount (USD, optional) — up to {formatPrice(remainingCents, issue.order.currency)}</span>
              <input name="refundAmount" type="number" step="0.01" min="0" max={(remainingCents / 100).toFixed(2)} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-giuseppe-muted">Resolution notes (required — this becomes the permanent record)</span>
              <textarea name="resolution" required rows={3} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
            </label>
            <button className="w-full bg-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">
              Resolve case
            </button>
          </form>
        </>
      )}

      {issue.type === "SUSPECTED_COUNTERFEIT" && (
        <div className="space-y-3 border border-red-300 bg-red-50 p-6">
          <p className="text-[11px] uppercase tracking-widest2 text-red-800">Counterfeit report — high priority</p>
          <p className="text-xs text-red-800">
            Hiding a product removes it from the site immediately but never deletes it — it can be restored anytime.
          </p>
          {issue.order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between border-t border-red-200 pt-3 text-sm">
              <span>
                {item.productName} — currently {item.product.status.replace(/_/g, " ")}
              </span>
              {item.product.status !== "ARCHIVED" ? (
                <form action={hideProduct}>
                  <input type="hidden" name="productId" value={item.productId} />
                  <input type="hidden" name="issueId" value={issue.id} />
                  <button className="border border-red-700 px-3 py-1 text-[11px] uppercase tracking-widest2 text-red-700 hover:bg-red-700 hover:text-white">
                    Hide product
                  </button>
                </form>
              ) : (
                <form action={restoreProduct}>
                  <input type="hidden" name="productId" value={item.productId} />
                  <input type="hidden" name="issueId" value={issue.id} />
                  <button className="border border-giuseppe-ink px-3 py-1 text-[11px] uppercase tracking-widest2">Restore product</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="border border-giuseppe-line bg-white p-6">
        <p className="mb-4 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Seller payout holds</p>
        <div className="mb-4 space-y-2 text-xs">
          {holds.length === 0 && <p className="text-giuseppe-muted">No holds on this seller.</p>}
          {holds.map((h) => (
            <div key={h.id} className="flex items-center justify-between border-t border-giuseppe-line pt-2">
              <div>
                <p>
                  {h.orderId === issue.orderId ? "This order" : h.orderId ? "Another order" : "Entire seller"} —{" "}
                  {h.status === "OPEN" ? "Open" : "Released"} · {h.reason}
                </p>
                <p className="text-giuseppe-muted">
                  Placed by {h.placedByAdmin.name} on {h.placedAt.toLocaleDateString()}
                  {h.releasedByAdmin && ` · Released by ${h.releasedByAdmin.name} on ${h.releasedAt?.toLocaleDateString()}`}
                </p>
              </div>
              {h.status === "OPEN" && (
                <form action={releaseHold}>
                  <input type="hidden" name="holdId" value={h.id} />
                  <input type="hidden" name="issueId" value={issue.id} />
                  <button className="border border-giuseppe-ink px-2 py-1 text-[10px] uppercase tracking-widest2">Release</button>
                </form>
              )}
            </div>
          ))}
        </div>
        <form action={placeHold} className="space-y-2">
          <input type="hidden" name="brandId" value={issue.order.brandId} />
          <input type="hidden" name="orderId" value={issue.orderId} />
          <input type="hidden" name="issueId" value={issue.id} />
          <div className="flex gap-2 text-xs">
            <label className="flex items-center gap-1">
              <input type="radio" name="scope" value="order" defaultChecked /> This order only
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" name="scope" value="brand" /> Entire seller (suspend all payouts)
            </label>
          </div>
          <input name="reason" required placeholder="Reason for the hold" className="w-full border border-giuseppe-line px-2 py-1 text-xs" />
          <button className="border border-giuseppe-ink px-3 py-1.5 text-xs uppercase tracking-widest2">Place hold</button>
        </form>
      </div>

      <div className="border border-giuseppe-line bg-white p-6">
        <p className="mb-4 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Case messages</p>
        <div className="mb-4 space-y-3 text-sm">
          {issue.messages.length === 0 && <p className="text-giuseppe-muted">No messages yet.</p>}
          {issue.messages.map((m) => (
            <div key={m.id} className={`border-t border-giuseppe-line pt-2 ${m.internal ? "bg-yellow-50" : ""}`}>
              <p className="text-xs text-giuseppe-muted">
                {m.senderLabel ?? m.senderType} · {m.createdAt.toLocaleString()} {m.internal && "· Internal only"}
              </p>
              <p>{m.message}</p>
            </div>
          ))}
        </div>
        <form action={postMessage} className="space-y-2">
          <input type="hidden" name="issueId" value={issue.id} />
          <textarea name="message" required rows={2} placeholder="Write a message..." className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-giuseppe-muted">
              <input type="checkbox" name="internal" /> Internal note only (never sent to buyer/seller)
            </label>
            <button className="border border-giuseppe-ink px-4 py-1.5 text-[11px] uppercase tracking-widest2">Post</button>
          </div>
        </form>
      </div>
    </div>
  );
}
