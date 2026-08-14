import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice, bpsToPercentLabel } from "@/lib/pricing";
import { emails } from "@/lib/email";
import { stripe, isStripeConfigured } from "@/lib/stripe";

async function updateFulfillment(formData: FormData) {
  "use server";
  requireAdmin();
  const id = String(formData.get("id"));
  const trackingNumber = String(formData.get("trackingNumber") || "") || null;
  const trackingUrl = String(formData.get("trackingUrl") || "") || null;
  const carrier = String(formData.get("carrier") || "") || null;
  const fulfillmentStatus = formData.get("fulfillmentStatus") as any;
  const status = formData.get("status") as any;

  const order = await prisma.order.update({
    where: { id },
    data: { trackingNumber, trackingUrl, carrier, fulfillmentStatus, status },
  });

  if (fulfillmentStatus === "SHIPPED" && trackingNumber) {
    await emails.shippingConfirmation(order.email, order.orderNumber, trackingNumber, trackingUrl);
  }

  redirect(`/admin/orders/${id}`);
}

/**
 * Full refund only for V1 (no partial refunds) — per business decision, Giuseppe does
 * NOT retain its commission on a refund; the entire order total goes back to the
 * customer. Actually moves money via Stripe (not just a status label), and is kept in
 * sync with refunds issued directly in the Stripe dashboard via the charge.refunded
 * webhook (see src/app/api/webhooks/stripe/route.ts).
 */
async function refundOrder(formData: FormData) {
  "use server";
  requireAdmin();
  const id = String(formData.get("id"));
  const order = await prisma.order.findUniqueOrThrow({ where: { id } });

  if (!order.stripePaymentIntentId) {
    redirect(`/admin/orders/${id}?refundError=no-payment`);
  }

  if (isStripeConfigured()) {
    await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: "REFUNDED" },
  });

  await emails.orderRefunded(updated.email, updated.orderNumber, formatPrice(updated.totalCents, updated.currency));

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
    include: { brand: true, items: true },
  });
  if (!order) notFound();

  const canRefund = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status) && Boolean(order.stripePaymentIntentId);

  const address = order.shippingAddress as any;

  return (
    <div className="max-w-3xl space-y-10">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow mb-2">{order.brand.name}</p>
          <h1 className="font-display text-3xl">{order.orderNumber}</h1>
        </div>
        {order.status === "REFUNDED" && (
          <span className="border border-giuseppe-line px-3 py-1 text-xs uppercase tracking-widest2 text-giuseppe-muted">
            Refunded
          </span>
        )}
      </div>

      {searchParams.refundError === "no-payment" && (
        <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          Couldn&rsquo;t refund — this order has no linked Stripe payment (likely a test order created before Stripe was configured).
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
                {i.productName} × {i.quantity} — {formatPrice(i.unitPriceCents * i.quantity, order.currency)}
              </p>
            ))}
          </div>
          <div className="border-t border-giuseppe-line pt-3">
            <p>Subtotal: {formatPrice(order.subtotalCents, order.currency)}</p>
            <p>Shipping: {formatPrice(order.shippingCostCents, order.currency)}</p>
            <p>Total: {formatPrice(order.totalCents, order.currency)}</p>
            <p className="mt-2 text-giuseppe-muted">
              Giuseppe commission ({bpsToPercentLabel(order.commissionBps)}): {formatPrice(order.commissionCents, order.currency)}
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
            Refunds the full order total ({formatPrice(order.totalCents, order.currency)}) to the customer&rsquo;s
            original payment method through Stripe — Giuseppe does not retain its commission on refunded orders.
            This cannot be undone.
          </p>
          <form action={refundOrder}>
            <input type="hidden" name="id" value={order.id} />
            <button className="w-full border border-red-700 px-4 py-2 text-[11px] uppercase tracking-widest2 text-red-700 hover:bg-red-700 hover:text-white">
              Refund full order
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
