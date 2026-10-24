import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { emails } from "@/lib/email";
import { recalculateCommissionAfterRefund, formatPrice } from "@/lib/pricing";
import { logAudit } from "@/lib/audit";
import { recordRefund } from "@/lib/performance";
import { recordSaleOnPayment, recordRefundReversal, recordChargeback } from "@/lib/ledger";
import { getSystemAdmin } from "@/lib/admin-helpers";
import { attachMembershipCheckout, syncMembershipFromSubscription } from "@/lib/membership";
import { syncConnectedAccountStatus } from "@/lib/connect";

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
      // If Stripe Tax was enabled for this session (see isAutomaticTaxEnabled()),
      // total_details.amount_tax is the real tax Stripe calculated and collected — sync it
      // here since it isn't known at order-creation time. totalCents is updated to match
      // what was actually charged; subtotalCents/commissionCents/sellerAmountCents are
      // untouched, since commission is never charged on tax. Both are 0/no-op if tax
      // wasn't enabled for this checkout.
      const taxCents = Number(session.total_details?.amount_tax ?? 0);
      const order = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          stripePaymentIntentId: session.payment_intent ?? undefined,
          ...(taxCents > 0 ? { taxCents, totalCents: Number(session.amount_total ?? 0) } : {}),
        },
        include: { brand: true },
      });
      await recordSaleOnPayment(order.id);
      await emails.orderConfirmation(order.email, order.orderNumber, order.brand.name, formatPrice(order.totalCents, order.currency));
      if (order.brand.website) {
        // Seller notification — in V1 this goes to the brand's application contact email
        // captured at approval time; wiring a real seller notification address is a
        // follow-up once seller accounts/login exist.
      }
    }
    // Separate money flow from the customer-facing order checkout above — this is a
    // seller setting up their own $29/mo Giuseppe membership billing. See lib/membership.ts.
    if (session.mode === "subscription" && session.metadata?.membershipId) {
      await attachMembershipCheckout(session);
    }
  }

  // Keeps Membership.status in sync with the seller's actual subscription state (trialing
  // -> active -> past_due/canceled) — fires on every lifecycle change, not just checkout.
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as any;
    await syncMembershipFromSubscription(subscription);
  }

  // Records the dispute for visibility (see prisma/schema.prisma PaymentDispute) and puts
  // the affected order's funds on hold + opens a HIGH-priority case in the Issues
  // dashboard, but does NOT auto-refund or take any other action — who ultimately absorbs
  // chargeback liability (Giuseppe as merchant-of-record vs. the seller) is an unresolved
  // Stripe Connect/legal question (see README "Flagged Decisions"). Holding this ONE
  // order's funds never freezes the seller's other, unrelated funds (see lib/ledger.ts).
  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as any;
    const paymentIntentId = dispute.payment_intent as string | undefined;
    if (paymentIntentId) {
      const order = await prisma.order.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
      if (order) {
        await prisma.paymentDispute.upsert({
          where: { stripeDisputeId: dispute.id },
          update: { status: dispute.status, amountCents: dispute.amount, reason: dispute.reason },
          create: {
            orderId: order.id,
            stripeDisputeId: dispute.id,
            amountCents: dispute.amount,
            reason: dispute.reason ?? null,
            status: dispute.status ?? "needs_response",
            evidenceDueBy: dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000) : null,
          },
        });

        const admin = await getSystemAdmin();
        await prisma.payoutHold.create({
          data: {
            brandId: order.brandId,
            orderId: order.id,
            reason: `Payment dispute opened on Stripe (${dispute.reason ?? "reason not provided"}).`,
            placedByAdminId: admin.id,
          },
        });
        await recordChargeback({ orderId: order.id, brandId: order.brandId, amountCents: dispute.amount });
        await prisma.orderIssue.create({
          data: {
            orderId: order.id,
            type: "PAYMENT_DISPUTE",
            status: "ESCALATED",
            priority: "URGENT",
            description: `Stripe dispute ${dispute.id}: ${dispute.reason ?? "reason not provided"}.`,
            initiatedBy: "PAYMENT_PROCESSOR",
          },
        });

        await logAudit({
          entityType: "ORDER",
          entityId: order.id,
          action: "PAYMENT_DISPUTE_OPENED",
          actorType: "PAYMENT_PROCESSOR",
          reason: dispute.reason ?? undefined,
          amountCents: dispute.amount,
        });
      }
    }
  }

  if (event.type === "refund.updated") {
    const refund = event.data.object as any;
    const paymentIntentId = refund.payment_intent as string | undefined;
    if (paymentIntentId && refund.status === "succeeded") {
      const order = await prisma.order.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
      // Guard against double-processing: if this refund already pushed refundedCents up
      // to (or past) the Stripe-reported cumulative amount refunded on the intent, it was
      // almost certainly already recorded by the /admin/orders/[id] refund button before
      // this event arrived — no-op rather than double-refund/double-reverse-commission.
      if (order && order.status !== "REFUNDED" && order.status !== "CANCELLED") {
        const stripeRefundedTotalCents = Number(refund.amount ?? 0);
        if (stripeRefundedTotalCents > order.refundedCents) {
          const newlyRefundedCents = stripeRefundedTotalCents - order.refundedCents;
          const isFullRefund = stripeRefundedTotalCents >= order.totalCents;
          const { commissionAfterCents } = recalculateCommissionAfterRefund({
            subtotalCents: order.subtotalCents,
            commissionBps: order.commissionBps,
            cumulativeRefundedCents: stripeRefundedTotalCents,
          });

          const updated = await prisma.order.update({
            where: { id: order.id },
            data: {
              status: isFullRefund ? "REFUNDED" : order.status,
              refundedCents: stripeRefundedTotalCents,
              commissionCents: commissionAfterCents,
              sellerAmountCents: order.totalCents - stripeRefundedTotalCents - commissionAfterCents,
            },
          });

          await prisma.orderIssue.create({
            data: {
              orderId: order.id,
              type: "REFUND_REQUEST",
              reasonCode: "OTHER",
              status: "RESOLVED",
              description: "Refund issued directly from the Stripe dashboard (not via the admin refund button).",
              initiatedBy: "PAYMENT_PROCESSOR",
              refundCents: newlyRefundedCents,
              resolution: `${isFullRefund ? "Full" : "Partial"} refund synced from Stripe.`,
            },
          });

          await logAudit({
            entityType: "ORDER",
            entityId: order.id,
            action: isFullRefund ? "REFUND_FULL" : "REFUND_PARTIAL",
            previousStatus: order.status,
            newStatus: updated.status,
            actorType: "PAYMENT_PROCESSOR",
            reason: "Refund issued directly in Stripe dashboard",
            amountCents: newlyRefundedCents,
            commissionAfterCents,
            refundCents: newlyRefundedCents,
          });

          await recordRefund(order.brandId);
          await recordRefundReversal({ orderId: order.id, brandId: order.brandId, refundCents: newlyRefundedCents, isFullRefund });
          await emails.orderRefunded(updated.email, updated.orderNumber, formatPrice(newlyRefundedCents, updated.currency), !isFullRefund);
        }
      }
    }
  }

  // Tracks a connected seller's onboarding/verification progress (identity checks, bank
  // account, etc.) — fires repeatedly as Stripe verifies more of the account. See
  // lib/connect.ts. Checkout only routes real money to this account once both
  // charges_enabled and payouts_enabled are true.
  if (event.type === "account.updated") {
    const account = event.data.object as any;
    await syncConnectedAccountStatus(account);
  }

  return NextResponse.json({ received: true });
}
