import { notFound, redirect } from "next/navigation";
import { requireSellerOwnsProduct } from "@/lib/seller";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/pricing";
import { logAudit } from "@/lib/audit";
import { ImageUploader } from "@/components/ImageUploader";

const EDITABLE_DIRECTLY = ["DRAFT", "PENDING_REVIEW", "NEEDS_CHANGES", "OUT_OF_STOCK"];

function readFields(formData: FormData) {
  return {
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || ""),
    priceCents: Math.round(Number(formData.get("price") || 0) * 100),
    materials: String(formData.get("materials") || "") || null,
    sizingInfo: String(formData.get("sizingInfo") || "") || null,
    colorOptions: String(formData.get("colorOptions") || "").split(",").map((s) => s.trim()).filter(Boolean),
    sizeOptions: String(formData.get("sizeOptions") || "").split(",").map((s) => s.trim()).filter(Boolean),
    sku: String(formData.get("sku") || "") || null,
    processingTime: String(formData.get("processingTime") || "") || null,
    returnPolicy: String(formData.get("returnPolicy") || "") || null,
    refundPolicy: String(formData.get("refundPolicy") || "") || null,
    finalSale: formData.get("finalSale") === "on",
  };
}

/** Direct edit — only allowed for products not currently LIVE/PENDING_REACTIVATION. */
async function saveEdits(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const productId = String(formData.get("productId"));
  const { sellerAccount, product } = await requireSellerOwnsProduct(token, productId);
  if (!EDITABLE_DIRECTLY.includes(product.status)) notFound();

  const fields = readFields(formData);
  const imageUrls = formData.getAll("imageUrls").map(String).filter(Boolean);
  const resubmit = product.status === "NEEDS_CHANGES" || product.status === "DRAFT";

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: { ...fields, ...(resubmit ? { status: "PENDING_REVIEW", adminNote: null } : {}) },
    });
    if (imageUrls.length > 0) {
      const existing = await tx.productImage.count({ where: { productId } });
      await tx.productImage.createMany({ data: imageUrls.map((url, i) => ({ productId, url, position: existing + i })) });
    }
  });

  await logAudit({
    entityType: "PRODUCT",
    entityId: productId,
    action: resubmit ? "RESUBMIT" : "EDIT",
    previousStatus: product.status,
    newStatus: resubmit ? "PENDING_REVIEW" : product.status,
    actorType: "SELLER",
    actorId: sellerAccount.id,
    actorLabel: sellerAccount.brand.name,
  });

  redirect(`/seller/${token}/products/${productId}`);
}

/**
 * Material change to an already-LIVE product — does NOT touch the live listing. Creates
 * a ProductUpdateRequest for admin review; the current live version stays visible and
 * purchasable until (if) approved. See prisma/schema.prisma ProductUpdateRequest.
 */
async function proposeUpdate(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const productId = String(formData.get("productId"));
  const { sellerAccount, product } = await requireSellerOwnsProduct(token, productId);
  if (product.status !== "LIVE") notFound();

  const fields = readFields(formData);
  const sellerNote = String(formData.get("sellerNote") || "") || null;

  await prisma.productUpdateRequest.create({
    data: { productId, brandId: sellerAccount.brandId, proposedChanges: fields as any, sellerNote },
  });

  await logAudit({
    entityType: "PRODUCT",
    entityId: productId,
    action: "PROPOSE_UPDATE",
    actorType: "SELLER",
    actorId: sellerAccount.id,
    actorLabel: sellerAccount.brand.name,
    metadata: fields,
  });

  redirect(`/seller/${token}/products/${productId}?submitted=1`);
}

/** Inventory-quantity-only edit — allowed even while LIVE, no re-review needed (spec §7). */
async function updateInventory(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const productId = String(formData.get("productId"));
  const { sellerAccount } = await requireSellerOwnsProduct(token, productId);
  const raw = String(formData.get("inventoryQuantity") || "");
  const madeToOrder = formData.get("madeToOrder") === "on";

  await prisma.product.update({
    where: { id: productId },
    data: { madeToOrder, inventoryQuantity: madeToOrder || raw === "" ? null : Math.max(0, Math.round(Number(raw))) },
  });

  await logAudit({
    entityType: "PRODUCT",
    entityId: productId,
    action: "UPDATE_INVENTORY",
    actorType: "SELLER",
    actorId: sellerAccount.id,
    actorLabel: sellerAccount.brand.name,
  });

  redirect(`/seller/${token}/products/${productId}`);
}

/** No penalty, fully reversible — hides the product immediately (spec §5). */
async function markOutOfStock(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const productId = String(formData.get("productId"));
  const { sellerAccount, product } = await requireSellerOwnsProduct(token, productId);
  if (product.status !== "LIVE") notFound();

  await prisma.product.update({ where: { id: productId }, data: { status: "OUT_OF_STOCK" } });
  await logAudit({
    entityType: "PRODUCT",
    entityId: productId,
    action: "MARK_OUT_OF_STOCK",
    previousStatus: "LIVE",
    newStatus: "OUT_OF_STOCK",
    actorType: "SELLER",
    actorId: sellerAccount.id,
    actorLabel: sellerAccount.brand.name,
    reason: "Seller marked out of stock — pre-emptive, no performance impact.",
  });

  redirect(`/seller/${token}/products/${productId}`);
}

/** Requires re-confirmation; stays hidden until an admin approves it back to LIVE. */
async function requestReactivation(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const productId = String(formData.get("productId"));
  const { sellerAccount, product } = await requireSellerOwnsProduct(token, productId);
  if (product.status !== "OUT_OF_STOCK") notFound();
  const confirmed = formData.get("confirmDetailsAccurate") === "on";
  if (!confirmed) redirect(`/seller/${token}/products/${productId}?error=confirm-required`);

  await prisma.product.update({ where: { id: productId }, data: { status: "PENDING_REACTIVATION" } });
  await logAudit({
    entityType: "PRODUCT",
    entityId: productId,
    action: "REQUEST_REACTIVATION",
    previousStatus: "OUT_OF_STOCK",
    newStatus: "PENDING_REACTIVATION",
    actorType: "SELLER",
    actorId: sellerAccount.id,
    actorLabel: sellerAccount.brand.name,
  });

  redirect(`/seller/${token}/products/${productId}`);
}

export default async function SellerProductDetailPage({
  params,
  searchParams,
}: {
  params: { token: string; productId: string };
  searchParams: { submitted?: string; error?: string };
}) {
  const { product } = await requireSellerOwnsProduct(params.token, params.productId);
  const fullProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id }, include: { images: true } });
  const pendingUpdateRequest = await prisma.productUpdateRequest.findFirst({
    where: { productId: product.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  const editable = EDITABLE_DIRECTLY.includes(fullProduct.status);
  const isLive = fullProduct.status === "LIVE";

  return (
    <div className="editorial-container max-w-2xl space-y-8 py-14 sm:py-20">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow mb-2">Seller Portal</p>
          <h1 className="font-display text-3xl">{fullProduct.name}</h1>
        </div>
        <span className="border border-giuseppe-line px-3 py-1 text-xs uppercase tracking-widest2 text-giuseppe-muted">
          {fullProduct.status.replace(/_/g, " ")}
        </span>
      </div>

      {searchParams.submitted && (
        <p className="border border-giuseppe-line bg-white px-4 py-3 text-sm">
          Your proposed changes were submitted to Giuseppe — the live listing is unchanged until they're approved.
        </p>
      )}
      {searchParams.error === "confirm-required" && (
        <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          Please confirm the product details are still accurate before requesting reactivation.
        </p>
      )}

      {fullProduct.adminNote && (fullProduct.status === "NEEDS_CHANGES" || fullProduct.status === "REJECTED" || fullProduct.status === "OUT_OF_STOCK") && (
        <div className="border border-giuseppe-line bg-white p-4 text-sm">
          <p className="mb-1 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Note from Giuseppe</p>
          <p>{fullProduct.adminNote}</p>
        </div>
      )}

      {fullProduct.status === "LIVE" && (
        <div className="flex items-center justify-between border border-giuseppe-line bg-white p-4">
          <p className="text-sm">This product is live and purchasable.</p>
          <form action={markOutOfStock}>
            <input type="hidden" name="token" value={params.token} />
            <input type="hidden" name="productId" value={fullProduct.id} />
            <button className="border border-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2">Mark out of stock</button>
          </form>
        </div>
      )}

      {fullProduct.status === "OUT_OF_STOCK" && (
        <div className="space-y-3 border border-giuseppe-line bg-white p-4">
          <p className="text-sm">
            Hidden from customers — this is fully reversible and carries no penalty. Request reactivation when it's back in
            stock; Giuseppe will need to approve it going live again.
          </p>
          <form action={requestReactivation} className="space-y-2">
            <input type="hidden" name="token" value={params.token} />
            <input type="hidden" name="productId" value={fullProduct.id} />
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="confirmDetailsAccurate" required /> I confirm the product details below are still accurate
            </label>
            <button className="border border-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2">Request reactivation</button>
          </form>
        </div>
      )}

      {fullProduct.status === "PENDING_REACTIVATION" && (
        <p className="border border-giuseppe-line bg-white p-4 text-sm text-giuseppe-muted">
          Reactivation requested — awaiting Giuseppe's approval. Still hidden from customers until then.
        </p>
      )}

      {isLive && (
        <div className="border border-giuseppe-line bg-white p-4">
          <p className="mb-3 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Inventory (updates immediately, no review needed)</p>
          <form action={updateInventory} className="flex items-end gap-3">
            <input type="hidden" name="token" value={params.token} />
            <input type="hidden" name="productId" value={fullProduct.id} />
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-giuseppe-muted">Quantity in stock</span>
              <input
                name="inventoryQuantity"
                type="number"
                min={0}
                defaultValue={fullProduct.inventoryQuantity ?? ""}
                placeholder="Blank = not tracked"
                className="w-40 border border-giuseppe-line px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" name="madeToOrder" defaultChecked={fullProduct.madeToOrder} /> Made to order
            </label>
            <button className="border border-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2">Save</button>
          </form>
        </div>
      )}

      {pendingUpdateRequest && (
        <p className="border border-giuseppe-line bg-white p-4 text-sm text-giuseppe-muted">
          You have a pending update request submitted {pendingUpdateRequest.createdAt.toLocaleDateString()} — the live listing
          stays as-is until Giuseppe reviews it.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {fullProduct.images.map((img) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={img.id} src={img.url} alt={img.altText ?? ""} className="aspect-square w-full object-cover" />
        ))}
      </div>

      {editable && !pendingUpdateRequest && (
        <form action={saveEdits} className="space-y-6 border border-giuseppe-line bg-white p-6">
          <input type="hidden" name="token" value={params.token} />
          <input type="hidden" name="productId" value={fullProduct.id} />
          <ProductFields product={fullProduct} />
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Add photos</p>
            <ImageUploader brandId={fullProduct.brandId} sellerToken={params.token} fieldName="imageUrls" />
          </div>
          <button className="w-full bg-giuseppe-ink px-6 py-3 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">
            {fullProduct.status === "DRAFT" || fullProduct.status === "NEEDS_CHANGES" ? "Save & submit for review" : "Save changes"}
          </button>
        </form>
      )}

      {isLive && !pendingUpdateRequest && (
        <details className="border border-giuseppe-line bg-white p-6">
          <summary className="cursor-pointer text-[11px] uppercase tracking-widest2 text-giuseppe-muted">
            Propose a change to this live listing
          </summary>
          <form action={proposeUpdate} className="mt-6 space-y-6">
            <input type="hidden" name="token" value={params.token} />
            <input type="hidden" name="productId" value={fullProduct.id} />
            <p className="text-xs text-giuseppe-muted">
              Price, photos, description, materials, and processing time changes need Giuseppe's approval before they go
              live — the current listing stays up while it's reviewed.
            </p>
            <ProductFields product={fullProduct} />
            <label className="block">
              <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Note to Giuseppe (optional)</span>
              <textarea name="sellerNote" rows={2} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
            </label>
            <button className="w-full border border-giuseppe-ink px-6 py-3 text-[11px] uppercase tracking-widest2">
              Submit proposed changes
            </button>
          </form>
        </details>
      )}

      {(fullProduct.status === "REJECTED" || fullProduct.status === "ARCHIVED") && (
        <p className="border border-giuseppe-line bg-white p-4 text-sm text-giuseppe-muted">
          This listing is {fullProduct.status.toLowerCase()} and can't be edited. Contact Giuseppe if you believe this is a
          mistake.
        </p>
      )}
    </div>
  );
}

function ProductFields({ product }: { product: any }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Name</span>
          <input name="name" defaultValue={product.name} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Price (USD)</span>
          <input name="price" type="number" step="0.01" defaultValue={(product.priceCents / 100).toFixed(2)} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>
      </div>
      <label className="block">
        <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Description</span>
        <textarea name="description" rows={4} defaultValue={product.description} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Materials</span>
          <textarea name="materials" rows={2} defaultValue={product.materials ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Sizing</span>
          <textarea name="sizingInfo" rows={2} defaultValue={product.sizingInfo ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Color options (comma-separated)</span>
          <input name="colorOptions" defaultValue={product.colorOptions.join(", ")} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Size options (comma-separated)</span>
          <input name="sizeOptions" defaultValue={product.sizeOptions.join(", ")} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">SKU</span>
          <input name="sku" defaultValue={product.sku ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Processing time</span>
          <input name="processingTime" defaultValue={product.processingTime ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Return policy</span>
          <input name="returnPolicy" defaultValue={product.returnPolicy ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Refund policy</span>
          <input name="refundPolicy" defaultValue={product.refundPolicy ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="finalSale" defaultChecked={product.finalSale} /> Final Sale (buyers can still return for
        counterfeit, wrong item, not-as-described, defective, damaged, missing, or never-arrived)
      </label>
    </>
  );
}
