"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { trackEvent } from "@/lib/analytics";
import { LinkButton } from "@/components/Button";

export function CheckoutSuccessClient() {
  const params = useSearchParams();
  const orderNumber = params.get("order");
  const isMock = params.get("mock") === "1";
  const { clearBrand, items } = useCart();

  useEffect(() => {
    trackEvent("purchase", { orderNumber });
    // Best-effort: clear whichever brand's items are in the cart post-purchase.
    // (Order/brand linkage isn't available client-side here, so this clears everything
    // if only one brand is present — safe default for V1's single-brand-per-cart flow.)
    const brandIds = new Set(items.map((i) => i.brandId));
    brandIds.forEach((id) => clearBrand(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="editorial-container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow mb-4">Order Confirmed</p>
      <h1 className="font-display text-4xl sm:text-5xl">Thank you.</h1>
      <p className="mt-6 max-w-md text-giuseppe-muted">
        Order {orderNumber} is confirmed. A confirmation email is on its way.
        {isMock && " (Stripe test keys are not configured — this order was recorded without a live payment.)"}
      </p>
      <div className="mt-10">
        <LinkButton href="/discover">Continue exploring Giuseppe</LinkButton>
      </div>
    </div>
  );
}
