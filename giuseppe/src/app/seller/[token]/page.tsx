import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/pricing";
import { emails } from "@/lib/email";

/**
 * Minimal seller portal — see spec §16: sellers can view orders, add tracking, update
 * fulfillment status, and see basic account info. Sellers cannot publish products
 * directly; only Giuseppe admins can (spec §16). Access is via an unguessable per-brand
 * token link (see SellerAccount.portalToken) rather than a full login system for V1 —
 * flagged in schema.prisma as something to replace with real seller auth before this
 * link is distributed outside of a direct, trusted admin-to-seller email.
 */
async function updateOrder(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const orderId = String(formData.get("orderId"));
  const sellerAccount = await prisma.sellerAccount.findUnique({ where: { portalToken: token } });
  if (!sellerAccount) notFound();

  const order = await prisma.order.findFirst({ where: { id: orderId, brandId: sellerAccount.brandId } });
  if (!order) notFound();

  const trackingNumber = String(formData.get("trackingNumber") || "") || null;
  const trackingUrl = String(formData.get("trackingUrl") || "") || null;
  const carrier = String(formData.get("carrier") || "") || null;
  const fulfillmentStatus = formData.get("fulfillmentStatus") as any;

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { trackingNumber, trackingUrl, carrier, fulfillmentStatus },
  });

  if (fulfillmentStatus === "SHIPPED" && trackingNumber) {
    await emails.shippingConfirmation(updated.email, updated.orderNumber, trackingNumber, trackingUrl);
  }

  redirect(`/seller/${token}`);
}

export default async function SellerPortalPage({ params }: { params: { token: string } }) {
  const sellerAccount = await prisma.sellerAccount.findUnique({
    where: { portalToken: params.token },
    include: { brand: { include: { orders: { include: { items: true }, orderBy: { createdAt: "desc" } } } } },
  });
  if (!sellerAccount) notFound();

  const brand = sellerAccount.brand;

  return (
    <div className="editorial-container py-14 sm:py-20">
      <p className="eyebrow mb-3">Seller Portal</p>
      <h1 className="mb-2 font-display text-3xl">{brand.name}</h1>
      <p className="mb-10 text-sm text-giuseppe-muted">
        Status: {brand.status} · Commission: {(brand.commissionBps / 100).toFixed(2)}% · Payout email: {sellerAccount.payoutEmail ?? "—"}
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
                <p key={i.id}>{i.productName} × {i.quantity}</p>
              ))}
              <p className="mt-1">Your payout: {formatPrice(o.sellerAmountCents, o.currency)}</p>
            </div>
            <form action={updateOrder} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
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
          </div>
        ))}
        {brand.orders.length === 0 && <p className="text-sm text-giuseppe-muted">No orders yet.</p>}
      </div>
    </div>
  );
}
