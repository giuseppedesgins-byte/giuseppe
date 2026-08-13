"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Cart model — see README "Checkout Model": Giuseppe does NOT do unified multi-vendor
 * checkout in V1. Items are grouped by brand client-side; each brand group checks out
 * independently against /checkout/[brandSlug]. The data shape below (brandId keyed
 * groups) is intentionally what a future unified-checkout cart would also use, so this
 * doesn't need to be re-architected later — only the checkout flow itself would change.
 */
export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  brandId: string;
  brandSlug: string;
  brandName: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  quantity: number;
  options?: Record<string, string>;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, options?: Record<string, string>) => void;
  updateQuantity: (productId: string, quantity: number, options?: Record<string, string>) => void;
  clearBrand: (brandId: string) => void;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "giuseppe_cart_v1";

function sameLine(a: CartItem, b: { productId: string; options?: Record<string, string> }) {
  return a.productId === b.productId && JSON.stringify(a.options ?? {}) === JSON.stringify(b.options ?? {});
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => sameLine(i, item));
      if (existing) {
        return prev.map((i) => (sameLine(i, item) ? { ...i, quantity: i.quantity + item.quantity } : i));
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((productId: string, options?: Record<string, string>) => {
    setItems((prev) => prev.filter((i) => !sameLine(i, { productId, options })));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, options?: Record<string, string>) => {
    setItems((prev) =>
      prev.map((i) => (sameLine(i, { productId, options }) ? { ...i, quantity: Math.max(1, quantity) } : i))
    );
  }, []);

  const clearBrand = useCallback((brandId: string) => {
    setItems((prev) => prev.filter((i) => i.brandId !== brandId));
  }, []);

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearBrand, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
