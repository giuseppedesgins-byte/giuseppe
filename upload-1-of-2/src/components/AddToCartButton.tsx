"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/Button";
import { trackEvent } from "@/lib/analytics";
import type { CartItem } from "@/lib/cart-context";

export function AddToCartButton({
  product,
  colorOptions,
  sizeOptions = [],
}: {
  product: Omit<CartItem, "quantity" | "options">;
  colorOptions: string[];
  sizeOptions?: string[];
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [color, setColor] = useState(colorOptions[0] ?? "");
  const [size, setSize] = useState(sizeOptions[0] ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(false);

  function buildOptions() {
    const options: Record<string, string> = {};
    if (color) options.color = color;
    if (size) options.size = size;
    return Object.keys(options).length > 0 ? options : undefined;
  }

  function handleAdd() {
    // Sizes aren't tracked as separate inventory (see product schema note) — this is just
    // making sure a size is picked when the seller offers more than one, same as color.
    if (sizeOptions.length > 0 && !size) {
      setError(true);
      return;
    }
    setError(false);
    addItem({ ...product, quantity, options: buildOptions() });
    trackEvent("add_to_cart", { productId: product.productId, quantity });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="space-y-5">
      {colorOptions.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Color</p>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`border px-4 py-2 text-sm ${
                  color === c ? "border-giuseppe-ink bg-giuseppe-ink text-giuseppe-bg" : "border-giuseppe-line"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {sizeOptions.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Size</p>
          <div className="flex flex-wrap gap-2">
            {sizeOptions.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSize(s);
                  setError(false);
                }}
                className={`border px-4 py-2 text-sm ${
                  size === s ? "border-giuseppe-ink bg-giuseppe-ink text-giuseppe-bg" : "border-giuseppe-line"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {error && <p className="mt-2 text-xs text-red-700">Please select a size.</p>}
        </div>
      )}

      <div className="flex items-center gap-3">
        <p className="text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Qty</p>
        <div className="flex items-center border border-giuseppe-line">
          <button className="px-3 py-1" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
            −
          </button>
          <span className="px-3 text-sm">{quantity}</span>
          <button className="px-3 py-1" onClick={() => setQuantity((q) => q + 1)}>
            +
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleAdd} className="flex-1">
          {added ? "Added" : "Add to Cart"}
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            handleAdd();
            router.push(`/checkout/${product.brandSlug}`);
          }}
        >
          Buy Now
        </Button>
      </div>
    </div>
  );
}
