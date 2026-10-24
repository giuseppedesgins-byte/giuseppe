import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { stripe, isStripeConfigured, isAutomaticTaxEnabled } from "@/lib/stripe";
import { calculateOrderSplit } from "@/lib/pricing";
import { SITE_URL } from "@/lib/brand";
import { recordOrderCreated } from "@/lib/performance";
import { releaseAbandonedCheckouts } from "@/lib/order-sweep";

const schema = z.object({
  brandSlug: z.string(),
  email: z.string().email(),
  shippingOptionId: z.string(),
  shippingAddress: z.object({
    name: z.string(),
    address1: z.string(),
    address2: z.string().optional(),
    city: z.string(),
    region: z.string().optional(),
    postalCode: z.string(),
    country: z.string(),
  }),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().min(1), options: z.record(z.string()).optional() })).min(1),
});

/**
 * Creates a single-brand Order (see README "Checkout Model") and a Stripe Checkout
 * Session in test mode. FLAG: this uses a simple platform-collects flow — the funds
 * currently settle to the Giuseppe platform Stripe account, not a connected seller
 * account. Routing funds to sellers via Stripe Connect (destination charges vs.
 * separate transfers) is an explicit open decision — see lib/stripe.ts and README.
 * Do not treat this as final settlement/payout logic.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }
  const data = parsed.data;

  // Release any abandoned reservations first, so stock someone else let expire is actually
  // available to this shopper rather than sitting locked behind a stale PENDING_PAYMENT
  // order. See lib/order-sweep.ts.
  await releaseAbandonedCheckouts();

  const brand = await prisma.brand.findFirst({ where: { slug: data.brandSlug, status: "ACTIVE" }, include: { sellerAccount: true } });
  if (!brand) return NextResponse.json({ error: "Brand not found." }, { status: 404 });

  const shippingOption = await prisma.shippingOption.findFirst({ where: { id: data.shippingOptionId, brandId: brand.id } });
  if (!shippingOption) return NextResponse.json({ error: "Invalid shipping option." }, { status: 400 });

  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, brandId: brand.id, status: "LIVE" } });
  if (products.length !== new Set(productIds).size) {
    return NextResponse.json({ error: "One or more products are unavailable." }, { status: 400 });
  }

  // Inventory protection: for any product that tracks inventory (inventoryQuantity is not
  // null), atomically verify + decrement stock inside a transaction so two concurrent
  // checkouts can never both succeed for the last unit. Products with inventoryQuantity ===
  // null are treated as made-to-order/untracked and are never blocked here.
  try {
    await prisma.$transaction(async (tx) => {
      for (const item of data.items) {
        const product = products.find((p) => p.id === item.productId)!;
        if (product.inventoryQuantity === null) continue;
        const result = await tx.product.updateMany({
          where: { id: product.id, inventoryQuantity: { gte: item.quantity } },
          data: { inventoryQuantity: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw new Error(`INSUFFICIENT_STOCK:${product.name}`);
        }
      }
    });
  } catch (err: any) {
    const message = String(err?.message || "");
    if (message.startsWith("INSUFFICIENT_STOCK:")) {
      return NextResponse.json(
        { error: `${message.split(":")[1]} just sold out — please remove it from your cart.` },
        { status: 409 }
      );
    }
    throw err;
  }

  const subtotalCents = data.items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)!;
    return sum + product.priceCents * item.quantity;
  }, 0);

  const { totalCents, commissionCents, sellerAmountCents } = calculateOrderSplit({
    subtotalCents,
    shippingCostCents: shippingOption.costCents,
    commissionBps: brand.commissionBps,
  });

  const orderNumber = `GS-${Date.now().toString(36).toUpperCase()}`;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      email: data.email,
      brandId: brand.id,
      shippingAddress: data.shippingAddress,
      shippingOptionId: shippingOption.id,
      shippingMethod: shippingOption.method,
      shippingCostCents: shippingOption.costCents,
      subtotalCents,
      commissionBps: brand.commissionBps,
      commissionCents,
      sellerAmountCents,
      totalCents,
      currency: shippingOption.currency,
      status: "PENDING_PAYMENT",
      items: {
        create: data.items.map((item) => {
          const product = products.find((p) => p.id === item.productId)!;
          return {
            productId: product.id,
            productName: product.name,
            unitPriceCents: product.priceCents,
            quantity: item.quantity,
            options: item.options ?? {},
          };
        }),
      },
    },
  });

  await recordOrderCreated(brand.id);

  if (!isStripeConfigured()) {
    // Dev fallback so the flow is testable before Stripe keys are added.
    return NextResponse.json({ url: `${SITE_URL}/checkout/success?order=${order.orderNumber}&mock=1` });
  }

  // NOTE on inventory + abandoned checkouts: stock was already decremented above, before
  // payment. If a customer opens Stripe Checkout and never completes it, that reservation
  // is released automatically — see releaseAbandonedCheckouts() above, which runs on every
  // checkout attempt and expires any PENDING_PAYMENT order older than
  // MarketplaceSettings.abandonedCheckoutMinutes, restoring its stock. If Stripe session
  // creation itself fails right here (this specific attempt), inventory is restored below
  // immediately rather than waiting for the sweep.
  // Stripe Tax needs to know the customer's location to calculate anything — since we
  // already collect a shipping address in our own form (rather than Stripe's), we attach
  // it to a real Stripe Customer up front instead of asking the buyer to enter it again on
  // Stripe's page. KNOWN GAP: our shipping form's "Country" field is free text, not a
  // constrained ISO-3166 alpha-2 code, which Stripe Tax needs to calculate reliably —
  // worth tightening to a dropdown before relying on this for real filings.
  let taxCustomerId: string | undefined;
  if (isAutomaticTaxEnabled()) {
    const customer = await stripe.customers.create({
      email: data.email,
      address: {
        line1: data.shippingAddress.address1,
        line2: data.shippingAddress.address2 || undefined,
        city: data.shippingAddress.city,
        state: data.shippingAddress.region || undefined,
        postal_code: data.shippingAddress.postalCode,
        country: data.shippingAddress.country,
      },
    });
    taxCustomerId = customer.id;
  }

  // Stripe Connect (Aug 2026 decision: Express accounts + destination charges — see
  // lib/connect.ts). Only route funds to the seller's own connected account once they've
  // finished onboarding (charges_enabled AND payouts_enabled) — otherwise this falls back
  // to the original platform-only flow, so a brand mid-onboarding (or who never starts)
  // still checks out fine, funds just stay on the platform until a manual payout is
  // recorded (see /admin/brands/[id]).
  //
  // KNOWN GAP: if Stripe Tax is ALSO enabled, application_fee_amount below only accounts
  // for commission, not tax — the tax portion currently rides along in the transfer to the
  // seller rather than being held back for Giuseppe to remit. Fine while Tax defaults off;
  // revisit before running both together.
  const connectReady = brand.sellerAccount?.stripeAccountId && brand.sellerAccount.stripeOnboardingComplete;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ...(taxCustomerId ? { customer: taxCustomerId } : { customer_email: data.email }),
      ...(isAutomaticTaxEnabled() ? { automatic_tax: { enabled: true } } : {}),
      ...(connectReady
        ? {
            payment_intent_data: {
              application_fee_amount: commissionCents,
              transfer_data: { destination: brand.sellerAccount!.stripeAccountId! },
            },
          }
        : {}),
      line_items: [
        ...data.items.map((item) => {
          const product = products.find((p) => p.id === item.productId)!;
          const variant = [item.options?.size ? `Size ${item.options.size}` : null, item.options?.color ?? null]
            .filter(Boolean)
            .join(" / ");
          return {
            quantity: item.quantity,
            price_data: {
              currency: order.currency,
              unit_amount: product.priceCents,
              product_data: { name: variant ? `${product.name} (${variant})` : product.name },
            },
          };
        }),
        {
          quantity: 1,
          price_data: {
            currency: order.currency,
            unit_amount: shippingOption.costCents,
            product_data: { name: `Shipping — ${shippingOption.method}` },
          },
        },
      ],
      metadata: { orderId: order.id, orderNumber: order.orderNumber, brandId: brand.id },
      success_url: `${SITE_URL}/checkout/success?order=${order.orderNumber}`,
      cancel_url: `${SITE_URL}/checkout/${brand.slug}`,
    });

    await prisma.order.update({ where: { id: order.id }, data: { stripeCheckoutSessionId: session.id } });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Restore any decremented inventory since no payment session was actually created.
    await prisma.$transaction(
      data.items.map((item) => {
        const product = products.find((p) => p.id === item.productId)!;
        return prisma.product.updateMany({
          where: { id: product.id, inventoryQuantity: { not: null } },
          data: { inventoryQuantity: { increment: item.quantity } },
        });
      })
    );
    throw err;
  }
}
