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
}: {
  product: Omit<CartItem, "quantity" | "options">;
  colorOptions: string[];
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [color, setColor] = useState(colorOptions[0] ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({ ...product, quantity, options: color ? { color } : undefined });
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
