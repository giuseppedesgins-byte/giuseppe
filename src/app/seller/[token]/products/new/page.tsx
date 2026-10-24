import { redirect } from "next/navigation";
import { getSellerAccountByToken } from "@/lib/seller";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { logAudit } from "@/lib/audit";
import { ImageUploader } from "@/components/ImageUploader";

/**
 * Seller product proposal — always lands in PENDING_REVIEW, never publishes directly.
 * This is the ONE path a seller has to get a new product onto Giuseppe; every other
 * status change (approve, reject, request changes) is admin-only. See spec §3/§16.
 */
async function submitProposal(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const sellerAccount = await getSellerAccountByToken(token);

  const name = String(formData.get("name") || "").trim();
  if (!name) redirect(`/seller/${token}/products/new?error=missing-name`);

  const slug = await uniqueSlug(name, async (s) => Boolean(await prisma.product.findUnique({ where: { slug: s } })));
  const madeToOrder = formData.get("madeToOrder") === "on";
  const inventoryRaw = String(formData.get("inventoryQuantity") || "");
  const imageUrls = formData.getAll("imageUrls").map(String).filter(Boolean);

  const product = await prisma.product.create({
    data: {
      slug,
      brandId: sellerAccount.brandId,
      name,
      description: String(formData.get("description") || ""),
      priceCents: Math.round(Number(formData.get("price") || 0) * 100),
      materials: String(formData.get("materials") || "") || null,
      sizingInfo: String(formData.get("sizingInfo") || "") || null,
      colorOptions: String(formData.get("colorOptions") || "").split(",").map((s) => s.trim()).filter(Boolean),
      sizeOptions: String(formData.get("sizeOptions") || "").split(",").map((s) => s.trim()).filter(Boolean),
      sku: String(formData.get("sku") || "") || null,
      madeToOrder,
      inventoryQuantity: madeToOrder || inventoryRaw === "" ? null : Math.max(0, Math.round(Number(inventoryRaw))),
      processingTime: String(formData.get("processingTime") || "") || null,
      returnPolicy: String(formData.get("returnPolicy") || "") || null,
      refundPolicy: String(formData.get("refundPolicy") || "") || null,
      sellerNote: String(formData.get("sellerNote") || "") || null,
      finalSale: formData.get("finalSale") === "on",
      status: "PENDING_REVIEW",
      images: imageUrls.length > 0 ? { create: imageUrls.map((url, i) => ({ url, position: i })) } : undefined,
    },
  });

  await logAudit({
    entityType: "PRODUCT",
    entityId: product.id,
    action: "SUBMIT_PROPOSAL",
    newStatus: "PENDING_REVIEW",
    actorType: "SELLER",
    actorId: sellerAccount.id,
    actorLabel: sellerAccount.brand.name,
  });

  redirect(`/seller/${token}/products/${product.id}`);
}

export default async function ProposeProductPage({ params }: { params: { token: string } }) {
  const sellerAccount = await getSellerAccountByToken(params.token);

  return (
    <div className="editorial-container max-w-2xl py-14 sm:py-20">
      <p className="eyebrow mb-2">Seller Portal · {sellerAccount.brand.name}</p>
      <h1 className="mb-2 font-display text-3xl">Propose a product</h1>
      <p className="mb-10 text-sm text-giuseppe-muted">
        This goes to Giuseppe for review before it appears anywhere on the site — nothing publishes automatically.
      </p>

      <form action={submitProposal} className="space-y-6">
        <input type="hidden" name="token" value={params.token} />

        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Product name</span>
          <input name="name" required className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Description</span>
          <textarea name="description" required rows={4} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Price (USD)</span>
            <input name="price" required type="number" step="0.01" min="0" className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">SKU (internal, optional)</span>
            <input name="sku" className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Materials</span>
            <textarea name="materials" rows={2} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Sizing info</span>
            <textarea name="sizingInfo" rows={2} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Color options (comma-separated)</span>
            <input name="colorOptions" className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Size options (comma-separated)</span>
            <input name="sizeOptions" className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Inventory quantity</span>
            <input name="inventoryQuantity" type="number" min="0" placeholder="Leave blank if made to order" className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input type="checkbox" name="madeToOrder" /> Made to order (no fixed stock count)
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="finalSale" /> Final Sale (buyers can still return for counterfeit, wrong item, not-as-described,
          defective, damaged, missing, or never-arrived — Final Sale only waives change-of-mind returns)
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Processing time</span>
          <input name="processingTime" placeholder="e.g. 2-4 business days" className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Return policy</span>
            <input name="returnPolicy" className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Refund policy</span>
            <input name="refundPolicy" className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
        </div>

        <div>
          <p className="mb-2 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Photos</p>
          <ImageUploader brandId={sellerAccount.brandId} sellerToken={params.token} fieldName="imageUrls" />
        </div>

        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Note to Giuseppe (optional)</span>
          <textarea name="sellerNote" rows={2} placeholder="Anything the reviewer should know" className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>

        <button className="w-full bg-giuseppe-ink px-6 py-3 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">
          Submit for review
        </button>
      </form>
    </div>
  );
}
