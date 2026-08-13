import type { Metadata } from "next";
import { BrandCard } from "@/components/BrandCard";
import { getActiveBrands } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brands",
  description: "The full directory of brands approved by Giuseppe.",
};

export default async function BrandsPage() {
  const brands = await getActiveBrands();

  return (
    <div className="editorial-container py-14 sm:py-20">
      <p className="eyebrow mb-3">The Directory</p>
      <h1 className="mb-12 font-display text-4xl sm:text-5xl">Approved Giuseppe brands</h1>

      <div className="grid grid-cols-1 gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => (
          <BrandCard
            key={b.id}
            brand={{
              slug: b.slug,
              name: b.name,
              country: b.country,
              descriptor: b.story,
              heroImageUrl: b.heroImageUrl,
              foundingBrand: b.foundingBrand,
            }}
          />
        ))}
        {brands.length === 0 && (
          <p className="col-span-full py-20 text-center text-sm text-giuseppe-muted">
            No approved brands yet — run `npm run db:seed`.
          </p>
        )}
      </div>
    </div>
  );
}
