import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { emails } from "@/lib/email";

/**
 * Handles checkout.session.completed (marks orders paid) and refund.updated (keeps
 * orders in sync when a refund is issued directly from the Stripe dashboard, not just
 * via the "Refund full order" button in /admin/orders).
 *
 * Using refund.updated rather than the older charge.refunded — as of Stripe's Oct 2024
 * refund-events change, refund.created/updated/failed fire for all refund types
 * (including ordinary card refunds), and it's the event Stripe currently recommends.
 * Its payload is a Refund object (id, payment_intent, status, amount...), not a Charge,
 * which is why this checks `refund.status === "succeeded"` rather than treating the
 * event's mere existence as confirmation the refund completed.
 *
 * This handler no-ops if an order is already marked REFUNDED, so it doesn't double-send
 * the refund email when the refund was initiated from the admin button (which updates
 * the order and sends the email itself, before this webhook event even arrives).
 *
 * FLAG: dispute/chargeback handling (charge.dispute.created) is still not wired up —
 * add before accepting live payments. See README "Flagged Decisions".
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event;
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET || !sig) {
      throw new Error("Webhook secret not configured");
    }
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature verification failed` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      const order = await prisma.order.update({
        where: { id: orderId },
        data: { status: "PAID", stripePaymentIntentId: session.payment_intent ?? undefined },
        include: { brand: true },
      });
      await emails.orderConfirmation(order.email, order.orderNumber, order.brand.name, `$${(order.totalCents / 100).toFixed(2)}`);
      if (order.brand.website) {
        // Seller notification — in V1 this goes to the brand's application contact email
        // captured at approval time; wiring a real seller notification address is a
        // follow-up once seller accounts/login exist.
      }
    }
  }

  if (event.type === "refund.updated") {
    const refund = event.data.object as any;
    const paymentIntentId = refund.payment_intent as string | undefined;
    if (paymentIntentId && refund.status === "succeeded") {
      const order = await prisma.order.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
      if (order && order.status !== "REFUNDED") {
        const updated = await prisma.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
        await emails.orderRefunded(updated.email, updated.orderNumber, `$${(updated.totalCents / 100).toFixed(2)}`);
      }
    }
  }

  return NextResponse.json({ received: true });
}
