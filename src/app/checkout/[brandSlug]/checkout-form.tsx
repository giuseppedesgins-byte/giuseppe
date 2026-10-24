"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/pricing";
import { Button } from "@/components/Button";
import { trackEvent } from "@/lib/analytics";

type ShippingOption = {
  id: string;
  method: string;
  costCents: number;
  currency: string;
  estDeliveryDaysMin: number | null;
  estDeliveryDaysMax: number | null;
};

export function CheckoutForm({
  brandId,
  brandSlug,
  brandName,
  shippingOptions,
}: {
  brandId: string;
  brandSlug: string;
  brandName: string;
  shippingOptions: ShippingOption[];
}) {
  const { items } = useCart();
  const brandItems = useMemo(() => items.filter((i) => i.brandId === brandId), [items, brandId]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [shippingOptionId, setShippingOptionId] = useState(shippingOptions[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const subtotalCents = brandItems.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
  const selectedShipping = shippingOptions.find((s) => s.id === shippingOptionId);
  const totalCents = subtotalCents + (selectedShipping?.costCents ?? 0);

  if (brandItems.length === 0) {
    return <p className="text-sm text-giuseppe-muted">Your cart for {brandName} is empty.</p>;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    trackEvent("checkout_started", { brandId });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandSlug,
          email,
          shippingOptionId,
          shippingAddress: { name, address1, address2, city, region, postalCode, country },
          items: brandItems.map((i) => ({ productId: i.productId, quantity: i.quantity, options: i.options })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Checkout failed. Please try again.");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Checkout failed.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-12 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        {error && <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

        <div>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Contact</p>
          <input
            type="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-giuseppe-line bg-transparent px-3 py-2 text-sm outline-none focus:border-giuseppe-ink"
          />
        </div>

        <div>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Shipping address</p>
          <div className="space-y-3">
            <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-giuseppe-line bg-transparent px-3 py-2 text-sm outline-none focus:border-giuseppe-ink" />
            <input required placeholder="Address line 1" value={address1} onChange={(e) => setAddress1(e.target.value)} className="w-full border border-giuseppe-line bg-transparent px-3 py-2 text-sm outline-none focus:border-giuseppe-ink" />
            <input placeholder="Address line 2 (optional)" value={address2} onChange={(e) => setAddress2(e.target.value)} className="w-full border border-giuseppe-line bg-transparent px-3 py-2 text-sm outline-none focus:border-giuseppe-ink" />
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="w-full border border-giuseppe-line bg-transparent px-3 py-2 text-sm outline-none focus:border-giuseppe-ink" />
              <input placeholder="State / Region" value={region} onChange={(e) => setRegion(e.target.value)} className="w-full border border-giuseppe-line bg-transparent px-3 py-2 text-sm outline-none focus:border-giuseppe-ink" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Postal code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="w-full border border-giuseppe-line bg-transparent px-3 py-2 text-sm outline-none focus:border-giuseppe-ink" />
              <input required placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full border border-giuseppe-line bg-transparent px-3 py-2 text-sm outline-none focus:border-giuseppe-ink" />
            </div>
          </div>
        </div>

        <div>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Shipping method</p>
          <div className="space-y-2">
            {shippingOptions.map((opt) => (
              <label key={opt.id} className="flex cursor-pointer items-center justify-between border border-giuseppe-line px-4 py-3 text-sm">
                <span className="flex items-center gap-3">
                  <input type="radio" name="shipping" checked={shippingOptionId === opt.id} onChange={() => setShippingOptionId(opt.id)} />
                  {opt.method} ({opt.estDeliveryDaysMin ?? "?"}-{opt.estDeliveryDaysMax ?? "?"} days)
                </span>
                <span>{formatPrice(opt.costCents, opt.currency)}</span>
              </label>
            ))}
          </div>
        </div>

        <p className="text-xs text-giuseppe-muted">
          Payments are processed by Stripe in test mode. No real charge will occur.
        </p>

        <Button type="submit" disabled={status === "submitting"} className="w-full">
          {status === "submitting" ? "Redirecting to payment..." : "Continue to Payment"}
        </Button>
      </div>

      <div className="border-t border-giuseppe-line pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
        <p className="mb-4 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Order summary</p>
        <div className="space-y-3 text-sm">
          {brandItems.map((i) => (
            <div key={`${i.productId}-${JSON.stringify(i.options)}`} className="flex justify-between">
              <span>
                {i.name}
                {i.options?.size ? ` — Size ${i.options.size}` : ""}
                {i.options?.color ? ` — ${i.options.color}` : ""} × {i.quantity}
              </span>
              <span>{formatPrice(i.priceCents * i.quantity, i.currency)}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-2 border-t border-giuseppe-line pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-giuseppe-muted">Subtotal</span>
            <span>{formatPrice(subtotalCents, "usd")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-giuseppe-muted">Shipping</span>
            <span>{formatPrice(selectedShipping?.costCents ?? 0, "usd")}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>{formatPrice(totalCents, "usd")}</span>
          </div>
        </div>
      </div>
    </form>
  );
}
