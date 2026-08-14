import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";

async function createProduct(formData: FormData) {
  "use server";
  requireAdmin();
  const brandId = String(formData.get("brandId"));
  const name = String(formData.get("name"));
  const slug = await uniqueSlug(name, async (s) => Boolean(await prisma.product.findUnique({ where: { slug: s } })));
  const imageUrl = String(formData.get("imageUrl") || "");

  const product = await prisma.product.create({
    data: {
      slug,
      brandId,
      name,
      description: String(formData.get("description") || ""),
      priceCents: Math.round(Number(formData.get("price")) * 100),
      status: "DRAFT",
      images: imageUrl ? { create: [{ url: imageUrl, altText: name }] } : undefined,
    },
  });
  redirect(`/admin/products/${product.id}`);
}

export default async function NewProductPage({ searchParams }: { searchParams: { brandId?: string } }) {
  requireAdmin();
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-lg">
      <h1 className="mb-8 font-display text-3xl">New product</h1>
      <form action={createProduct} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Brand</span>
          <select name="brandId" required defaultValue={searchParams.brandId} className="w-full border border-giuseppe-line px-3 py-2 text-sm">
            <option value="">Select a brand...</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <input name="name" required placeholder="Product name" className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        <input name="price" required type="number" step="0.01" placeholder="Price (USD)" className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        <input name="imageUrl" placeholder="Primary image URL" className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        <textarea name="description" placeholder="Description" rows={4} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        <button className="bg-giuseppe-ink px-6 py-3 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">Create draft product</button>
      </form>
    </div>
  );
}
