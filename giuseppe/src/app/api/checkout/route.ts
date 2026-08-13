import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { calculateOrderSplit } from "@/lib/pricing";
import { SITE_URL } from "@/lib/brand";

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

  const brand = await prisma.brand.findFirst({ where: { slug: data.brandSlug, status: "ACTIVE" } });
  if (!brand) return NextResponse.json({ error: "Brand not found." }, { status: 404 });

  const shippingOption = await prisma.shippingOption.findFirst({ where: { id: data.shippingOptionId, brandId: brand.id } });
  if (!shippingOption) return NextResponse.json({ error: "Invalid shipping option." }, { status: 400 });

  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, brandId: brand.id, status: "PUBLISHED" } });
  if (products.length !== new Set(productIds).size) {
    return NextResponse.json({ error: "One or more products are unavailable." }, { status: 400 });
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

  if (!isStripeConfigured()) {
    // Dev fallback so the flow is testable before Stripe keys are added.
    return NextResponse.json({ url: `${SITE_URL}/checkout/success?order=${order.orderNumber}&mock=1` });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: data.email,
    line_items: [
      ...data.items.map((item) => {
        const product = products.find((p) => p.id === item.productId)!;
        return {
          quantity: item.quantity,
          price_data: {
            currency: order.currency,
            unit_amount: product.priceCents,
            product_data: { name: product.name },
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
}
