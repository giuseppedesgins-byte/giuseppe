import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function updateProduct(formData: FormData) {
  "use server";
  requireAdmin();
  const id = String(formData.get("id"));
  await prisma.product.update({
    where: { id },
    data: {
      name: String(formData.get("name")),
      description: String(formData.get("description") || ""),
      priceCents: Math.round(Number(formData.get("price")) * 100),
      materials: String(formData.get("materials") || "") || null,
      sizingInfo: String(formData.get("sizingInfo") || "") || null,
      processingTime: String(formData.get("processingTime") || "") || null,
      returnPolicy: String(formData.get("returnPolicy") || "") || null,
      refundPolicy: String(formData.get("refundPolicy") || "") || null,
      status: formData.get("status") as any,
      featured: formData.get("featured") === "on",
      newArrival: formData.get("newArrival") === "on",
      colorOptions: String(formData.get("colorOptions") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    },
  });
  redirect(`/admin/products/${id}`);
}

async function addImage(formData: FormData) {
  "use server";
  requireAdmin();
  const productId = String(formData.get("productId"));
  const url = String(formData.get("url"));
  if (url) {
    await prisma.productImage.create({ data: { productId, url, altText: String(formData.get("altText") || "") } });
  }
  redirect(`/admin/products/${productId}`);
}

export default async function AdminProductDetailPage({ params }: { params: { id: string } }) {
  requireAdmin();
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { brand: true, images: true },
  });
  if (!product) notFound();

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <p className="eyebrow mb-2">{product.brand.name}</p>
        <h1 className="font-display text-3xl">{product.name}</h1>
      </div>

      <form action={updateProduct} className="space-y-6 border border-giuseppe-line bg-white p-6">
        <input type="hidden" name="id" value={product.id} />
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Processing time</span>
            <input name="processingTime" defaultValue={product.processingTime ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Return policy</span>
            <input name="returnPolicy" defaultValue={product.returnPolicy ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Refund policy</span>
            <input name="refundPolicy" defaultValue={product.refundPolicy ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
        </div>
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Color options (comma-separated)</span>
          <input name="colorOptions" defaultValue={product.colorOptions.join(", ")} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Status</span>
            <select name="status" defaultValue={product.status} className="w-full border border-giuseppe-line px-3 py-2 text-sm">
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending approval</option>
              <option value="APPROVED">Approved</option>
              <option value="PUBLISHED">Published</option>
              <option value="UNPUBLISHED">Unpublished</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input type="checkbox" name="featured" defaultChecked={product.featured} /> Featured
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input type="checkbox" name="newArrival" defaultChecked={product.newArrival} /> New arrival
          </label>
        </div>

        <button className="bg-giuseppe-ink px-6 py-3 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">Save product</button>
      </form>

      <div className="border border-giuseppe-line bg-white p-6">
        <p className="mb-4 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Images</p>
        <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {product.images.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={img.id} src={img.url} alt={img.altText ?? ""} className="aspect-square w-full object-cover" />
          ))}
        </div>
        <form action={addImage} className="flex gap-2">
          <input type="hidden" name="productId" value={product.id} />
          <input name="url" placeholder="Image URL" className="flex-1 border border-giuseppe-line px-3 py-2 text-sm" />
          <input name="altText" placeholder="Alt text" className="flex-1 border border-giuseppe-line px-3 py-2 text-sm" />
          <button className="border border-giuseppe-ink px-4 py-2 text-xs uppercase tracking-widest2">Add</button>
        </form>
      </div>
    </div>
  );
}
