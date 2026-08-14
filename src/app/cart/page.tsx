"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/pricing";
import { LinkButton } from "@/components/Button";

/**
 * Cart groups items by brand — see README "Checkout Model". A customer with items from
 * two brands sees two separate groups, each with its own "Checkout" button leading to
 * /checkout/[brandSlug]. There is no unified cross-brand checkout in V1.
 */
export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCart();

  const groups = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const arr = map.get(item.brandId) ?? [];
      arr.push(item);
      map.set(item.brandId, arr);
    }
    return Array.from(map.entries()).map(([brandId, groupItems]) => ({
      brandId,
      brandName: groupItems[0].brandName,
      brandSlug: groupItems[0].brandSlug,
      items: groupItems,
      subtotalCents: groupItems.reduce((sum, i) => sum + i.priceCents * i.quantity, 0),
    }));
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="editorial-container flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
        <h1 className="font-display text-3xl">Your cart is empty</h1>
        <div className="mt-8">
          <LinkButton href="/discover">Discover Brands</LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="editorial-container py-14 sm:py-20">
      <h1 className="mb-10 font-display text-4xl">Your Cart</h1>
      <div className="space-y-16">
        {groups.map((group) => (
          <div key={group.brandId} className="border-t border-giuseppe-line pt-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl">{group.brandName}</h2>
              <span className="text-xs text-giuseppe-muted">Separate checkout</span>
            </div>

            <div className="space-y-6">
              {group.items.map((item) => (
                <div key={`${item.productId}-${JSON.stringify(item.options)}`} className="flex gap-5">
                  <div className="relative h-28 w-24 shrink-0 overflow-hidden bg-giuseppe-line">
                    {item.imageUrl && <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />}
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <p className="font-body text-sm">{item.name}</p>
                      {item.options?.color && (
                        <p className="text-xs text-giuseppe-muted">Color: {item.options.color}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-giuseppe-line">
                        <button
                          className="px-3 py-1"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1, item.options)}
                        >
                          −
                        </button>
                        <span className="px-3 text-sm">{item.quantity}</span>
                        <button
                          className="px-3 py-1"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1, item.options)}
                        >
                          +
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm">{formatPrice(item.priceCents * item.quantity, item.currency)}</span>
                        <button
                          className="text-xs text-giuseppe-muted underline"
                          onClick={() => removeItem(item.productId, item.options)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-giuseppe-line pt-6">
              <span className="text-sm text-giuseppe-muted">
                Subtotal: {formatPrice(group.subtotalCents, group.items[0].currency)}
              </span>
              <Link
                href={`/checkout/${group.brandSlug}`}
                className="inline-flex items-center justify-center bg-giuseppe-ink px-7 py-3 text-[11px] uppercase tracking-widest2 text-giuseppe-bg hover:bg-giuseppe-ink/85"
              >
                Checkout with {group.brandName}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
