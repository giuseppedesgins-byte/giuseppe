import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: { brandSlug: string } }) {
  const brand = await prisma.brand.findFirst({
    where: { slug: params.brandSlug, status: "ACTIVE" },
    include: { shippingOptions: true },
  });
  if (!brand) notFound();

  return (
    <div className="editorial-container py-14 sm:py-20">
      <p className="eyebrow mb-3">Checkout</p>
      <h1 className="mb-10 font-display text-3xl sm:text-4xl">{brand.name}</h1>
      <p className="mb-10 max-w-lg text-sm text-giuseppe-muted">
        This order is placed directly with {brand.name}, who is responsible for
        fulfillment. If your cart includes other brands, you&rsquo;ll check out with each
        separately.
      </p>
      <CheckoutForm
        brandId={brand.id}
        brandSlug={brand.slug}
        brandName={brand.name}
        shippingOptions={brand.shippingOptions.map((s) => ({
          id: s.id,
          method: s.method,
          costCents: s.costCents,
          currency: s.currency,
          estDeliveryDaysMin: s.estDeliveryDaysMin,
          estDeliveryDaysMax: s.estDeliveryDaysMax,
        }))}
      />
    </div>
  );
}
