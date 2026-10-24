import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice, variantLabel } from "@/lib/pricing";
import { emails } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { getMarketplaceSettings } from "@/lib/settings";
import { isReturnEligible, computeReturnShippingResponsibility } from "@/lib/returns";

const ISSUE_TYPES = [
  { value: "DEFECTIVE_OR_MISREPRESENTED", label: "Item is defective, wrong, or not as described" },
  { value: "NON_SHIPMENT", label: "My order never shipped" },
  { value: "DELIVERY_DISPUTE", label: "Marked delivered but I never received it" },
  { value: "SUSPECTED_COUNTERFEIT", label: "I think this item is counterfeit" },
  { value: "OTHER", label: "Something else" },
];

const REASON_CODES = [
  "DEFECTIVE_ITEM",
  "WRONG_ITEM_SHIPPED",
  "ITEM_NOT_AS_DESCRIBED",
  "ITEM_DAMAGED_IN_TRANSIT",
  "NEVER_ARRIVED",
  "LOST_IN_TRANSIT",
  "MISSING_ITEM",
  "SUSPECTED_COUNTERFEIT",
  "OTHER",
];

const RETURN_REASON_CODES = [
  { value: "SIZE_FIT_ISSUE", label: "Doesn't fit / wrong size" },
  { value: "CUSTOMER_CHANGED_MIND", label: "Changed my mind" },
  { value: "COLOR_STYLE_MISMATCH", label: "Color or style wasn't right" },
  { value: "WRONG_ITEM_SHIPPED", label: "Wrong item received" },
  { value: "ITEM_NOT_AS_DESCRIBED", label: "Item not as described" },
  { value: "DEFECTIVE_ITEM", label: "Item arrived damaged/defective" },
  { value: "SUSPECTED_COUNTERFEIT", label: "Suspected counterfeit" },
  { value: "OTHER", label: "Other" },
];

/**
 * General "Report a problem" — feeds the same OrderIssue/Cases system as the admin
 * dashboard and seller portal, so there's one source of truth regardless of who opened
 * a case. Never surfaces seller-performance data or internal notes back to the customer.
 */
async function submitIssue(formData: FormData) {
  "use server";
  const orderId = String(formData.get("orderId"));
  const email = String(formData.get("email"));
  const orderNumber = String(formData.get("orderNumber"));
  const type = formData.get("type") as any;
  const reasonCode = formData.get("reasonCode") as any;
  const description = String(formData.get("description") || "");
  const evidenceUrls = String(formData.get("evidenceUrls") || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const order = await prisma.order.findFirst({ where: { id: orderId, email: { equals: email, mode: "insensitive" } } });
  if (!order) redirect(`/orders/lookup`);

  await prisma.orderIssue.create({
    data: {
      orderId: order.id,
      type,
      reasonCode: reasonCode || null,
      status: "OPEN",
      priority: type === "SUSPECTED_COUNTERFEIT" ? "URGENT" : "NORMAL",
      description: description || null,
      customerEvidenceUrls: evidenceUrls,
      initiatedBy: "CUSTOMER",
    },
  });

  await logAudit({
    entityType: "ORDER",
    entityId: order.id,
    action: "CUSTOMER_REPORTED_ISSUE",
    actorType: "CUSTOMER",
    reason: `${type}${reasonCode ? ` / ${reasonCode}` : ""}`,
  });

  await emails.issueUpdate(order.email, order.orderNumber, "Received — we'll be in touch soon");

  redirect(`/orders/${orderNumber}?email=${encodeURIComponent(email)}&submitted=1`);
}

/**
 * Start a Return — a distinct path from the generic report above (spec "Returns"). Seller
 * reviews the request first (status AWAITING_SELLER); Giuseppe can step in if it isn't
 * resolved. Buyer-protection reasons (wrong/defective/counterfeit/never-arrived/missing)
 * are always eligible regardless of the return window or Final Sale status — see
 * lib/returns.ts. Everything else requires: delivered, within the configured return
 * window, and not Final Sale.
 */
async function startReturn(formData: FormData) {
  "use server";
  const orderId = String(formData.get("orderId"));
  const email = String(formData.get("email"));
  const orderNumber = String(formData.get("orderNumber"));
  const reasonCode = String(formData.get("reasonCode") || "OTHER");
  const description = String(formData.get("description") || "");
  const evidenceUrls = String(formData.get("evidenceUrls") || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const order = await prisma.order.findFirst({
    where: { id: orderId, email: { equals: email, mode: "insensitive" } },
    include: { items: { include: { product: true } } },
  });
  if (!order) redirect(`/orders/lookup`);

  const anyFinalSale = order.items.some((i) => i.product.finalSale);
  const eligibility = await isReturnEligible({ deliveredAt: order.deliveredAt, finalSale: anyFinalSale, reasonCode });
  if (!eligibility.eligible) {
    redirect(`/orders/${orderNumber}?email=${encodeURIComponent(email)}&returnError=${encodeURIComponent(eligibility.why)}`);
  }

  const settings = await getMarketplaceSettings();
  const respondByAt = new Date(Date.now() + settings.sellerResponseDeadlineDays * 24 * 60 * 60 * 1000);

  await prisma.orderIssue.create({
    data: {
      orderId: order.id,
      type: "RETURN_REQUEST",
      reasonCode: reasonCode as any,
      status: "AWAITING_SELLER",
      description: description || null,
      customerEvidenceUrls: evidenceUrls,
      initiatedBy: "CUSTOMER",
      returnShipmentStatus: "NOT_STARTED",
      returnShippingResponsibility: computeReturnShippingResponsibility(reasonCode),
      finalSaleAtPurchase: anyFinalSale,
      respondByAt,
    },
  });

  await logAudit({
    entityType: "ORDER",
    entityId: order.id,
    action: "RETURN_REQUESTED",
    actorType: "CUSTOMER",
    reason: reasonCode,
  });

  await emails.issueUpdate(order.email, order.orderNumber, "Return requested — awaiting the seller's review");

  redirect(`/orders/${orderNumber}?email=${encodeURIComponent(email)}&submitted=1`);
}

export default async function CustomerOrderPage({
  params,
  searchParams,
}: {
  params: { orderNumber: string };
  searchParams: { email?: string; submitted?: string; returnError?: string };
}) {
  const email = (searchParams.email || "").trim();
  if (!email) redirect("/orders/lookup");

  const order = await prisma.order.findFirst({
    where: { orderNumber: params.orderNumber.toUpperCase(), email: { equals: email, mode: "insensitive" } },
    include: { brand: true, items: { include: { product: true } }, issues: { orderBy: { createdAt: "desc" } } },
  });

  if (!order) {
    return (
      <div className="editorial-container max-w-md py-20 text-center">
        <p className="mb-6 text-sm text-giuseppe-muted">
          We couldn&rsquo;t find an order matching that number and email.
        </p>
        <Link href="/orders/lookup" className="text-xs uppercase tracking-widest2 underline">
          Try again
        </Link>
      </div>
    );
  }

  const address = order.shippingAddress as any;
  const anyFinalSale = order.items.some((i) => i.product.finalSale);
  const settings = await getMarketplaceSettings();

  return (
    <div className="editorial-container max-w-2xl space-y-10 py-14 sm:py-20">
      <div>
        <p className="eyebrow mb-2">{order.brand.name}</p>
        <h1 className="font-display text-3xl">{order.orderNumber}</h1>
        <p className="mt-2 text-sm text-giuseppe-muted">{order.status.replace(/_/g, " ")} · {order.fulfillmentStatus.replace(/_/g, " ")}</p>
      </div>

      {searchParams.submitted && (
        <p className="border border-giuseppe-line bg-white px-4 py-3 text-sm">
          Thanks — we&rsquo;ve received your request and will be in touch soon.
        </p>
      )}
      {searchParams.returnError && (
        <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{searchParams.returnError}</p>
      )}

      <div className="space-y-3 border border-giuseppe-line bg-white p-6 text-sm">
        {order.items.map((i) => (
          <p key={i.id}>
            {i.productName}{variantLabel(i.options)} × {i.quantity} — {formatPrice(i.unitPriceCents * i.quantity, order.currency)}
            {i.product.finalSale && <span className="ml-2 text-xs uppercase tracking-widest2 text-giuseppe-muted">Final Sale</span>}
          </p>
        ))}
        <div className="border-t border-giuseppe-line pt-3">
          {order.taxCents > 0 && <p>Tax: {formatPrice(order.taxCents, order.currency)}</p>}
          <p>Total: {formatPrice(order.totalCents, order.currency)}</p>
          {order.refundedCents > 0 && <p>Refunded: {formatPrice(order.refundedCents, order.currency)}</p>}
        </div>
        {order.trackingNumber && (
          <div className="border-t border-giuseppe-line pt-3">
            <p>Carrier: {order.carrier ?? "—"}</p>
            <p>Tracking: {order.trackingNumber}</p>
            {order.trackingUrl && (
              <a href={order.trackingUrl} className="underline" target="_blank" rel="noreferrer">
                Track package
              </a>
            )}
          </div>
        )}
        <div className="border-t border-giuseppe-line pt-3 text-giuseppe-muted">
          Ship to: {address?.name}, {address?.address1} {address?.address2}, {address?.city} {address?.region} {address?.postalCode}, {address?.country}
        </div>
      </div>

      {order.issues.length > 0 && (
        <div className="border border-giuseppe-line bg-white p-6">
          <p className="mb-3 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Your reports</p>
          <div className="space-y-2 text-sm">
            {order.issues.map((iss) => (
              <div key={iss.id} className="border-t border-giuseppe-line pt-2">
                <p>{iss.type.replace(/_/g, " ")} — {iss.status.replace(/_/g, " ")}</p>
                {iss.type === "RETURN_REQUEST" && iss.returnShipmentStatus && (
                  <p className="text-xs text-giuseppe-muted">Return shipment: {iss.returnShipmentStatus.replace(/_/g, " ")}</p>
                )}
                {iss.resolution && <p className="text-giuseppe-muted">{iss.resolution}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <details className="border border-giuseppe-line bg-white p-6">
        <summary className="cursor-pointer text-[11px] uppercase tracking-widest2">Start a return</summary>
        <div className="mt-6 space-y-4">
          {!order.deliveredAt && (
            <p className="text-sm text-giuseppe-muted">
              Returns open up once your order is marked delivered — reasons like a wrong, defective, or counterfeit item
              can still be reported below regardless.
            </p>
          )}
          {order.deliveredAt && (
            <p className="text-xs text-giuseppe-muted">
              Standard returns (changed mind, wrong size, etc.) are accepted within {settings.returnWindowDays} days of
              delivery{anyFinalSale ? " — note: this order includes a Final Sale item, which isn't eligible for a standard return, though defective/wrong/counterfeit reports are always accepted." : "."}
            </p>
          )}
          <form action={startReturn} className="space-y-4">
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="orderNumber" value={order.orderNumber} />
            <input type="hidden" name="email" value={email} />
            <label className="block">
              <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Reason</span>
              <select name="reasonCode" required className="w-full border border-giuseppe-line px-3 py-2 text-sm">
                {RETURN_REASON_CODES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Details</span>
              <textarea name="description" required rows={3} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">
                Photo links (optional, one per line)
              </span>
              <textarea name="evidenceUrls" rows={2} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
            </label>
            <button className="w-full bg-giuseppe-ink px-6 py-3 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">
              Submit return request
            </button>
          </form>
        </div>
      </details>

      <details className="border border-giuseppe-line bg-white p-6">
        <summary className="cursor-pointer text-[11px] uppercase tracking-widest2">Report a problem</summary>
        <form action={submitIssue} className="mt-6 space-y-4">
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="orderNumber" value={order.orderNumber} />
          <input type="hidden" name="email" value={email} />
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">What's going on?</span>
            <select name="type" required className="w-full border border-giuseppe-line px-3 py-2 text-sm">
              {ISSUE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Reason</span>
            <select name="reasonCode" className="w-full border border-giuseppe-line px-3 py-2 text-sm">
              {REASON_CODES.map((code) => (
                <option key={code} value={code}>{code.replace(/_/g, " ")}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Details</span>
            <textarea name="description" required rows={4} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">
              Photo links (optional, one per line) — paste links to photos hosted elsewhere for now
            </span>
            <textarea name="evidenceUrls" rows={2} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
          <button className="w-full bg-giuseppe-ink px-6 py-3 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">Submit report</button>
        </form>
      </details>
    </div>
  );
}
