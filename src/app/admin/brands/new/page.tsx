import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { DEFAULT_COMMISSION_BPS } from "@/lib/pricing";

async function createBrand(formData: FormData) {
  "use server";
  requireAdmin();
  const name = String(formData.get("name"));
  const slug = await uniqueSlug(name, async (s) => Boolean(await prisma.brand.findUnique({ where: { slug: s } })));
  const brand = await prisma.brand.create({
    data: { slug, name, status: "DRAFT", commissionBps: DEFAULT_COMMISSION_BPS },
  });
  await prisma.sellerPerformance.create({ data: { brandId: brand.id } });
  redirect(`/admin/brands/${brand.id}`);
}

export default function NewBrandPage() {
  requireAdmin();
  return (
    <div className="max-w-md">
      <h1 className="mb-8 font-display text-3xl">New brand</h1>
      <form action={createBrand} className="space-y-4">
        <input name="name" required placeholder="Brand name" className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        <button className="bg-giuseppe-ink px-6 py-3 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">Create draft brand</button>
      </form>
    </div>
  );
}
