import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { emails } from "@/lib/email";

/**
 * FLAG: refund/dispute handling (charge.refunded, charge.dispute.created) is not yet
 * wired up — only checkout.session.completed is handled, which is enough to mark an
 * order paid for MVP testing. Add refund/dispute + Connect payout webhooks before
 * accepting live payments. See README "Flagged Decisions".
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

  return NextResponse.json({ received: true });
}
