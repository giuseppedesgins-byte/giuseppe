import { redirect } from "next/navigation";

/**
 * Guest checkout means there are no customer accounts yet — order lookup is order
 * number + the email it was placed under, which is the same lightweight pattern used
 * elsewhere in this MVP (e.g. the seller portal's token link). Good enough to let a
 * customer view their order and report a problem without building full customer
 * accounts; revisit if/when real customer login exists.
 */
async function lookup(formData: FormData) {
  "use server";
  const orderNumber = String(formData.get("orderNumber") || "").trim().toUpperCase();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  redirect(`/orders/${encodeURIComponent(orderNumber)}?email=${encodeURIComponent(email)}`);
}

export default function OrderLookupPage() {
  return (
    <div className="editorial-container flex min-h-[60vh] max-w-md flex-col justify-center py-20">
      <p className="eyebrow mb-3">Order Lookup</p>
      <h1 className="mb-6 font-display text-3xl">Find your order</h1>
      <form action={lookup} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Order number</span>
          <input name="orderNumber" required placeholder="GS-XXXXXXXX" className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Email used at checkout</span>
          <input name="email" type="email" required className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>
        <button className="w-full bg-giuseppe-ink px-6 py-3 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">Find order</button>
      </form>
    </div>
  );
}
