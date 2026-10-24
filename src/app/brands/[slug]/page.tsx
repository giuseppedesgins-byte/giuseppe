import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { getBrandBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const brand = await getBrandBySlug(params.slug);
  if (!brand) return {};
  return {
    title: brand.name,
    description: brand.story ?? undefined,
    openGraph: { title: brand.name, description: brand.story ?? undefined, images: brand.heroImageUrl ? [brand.heroImageUrl] : [] },
  };
}

export default async function BrandStorefrontPage({ params }: { params: { slug: string } }) {
  const brand = await getBrandBySlug(params.slug);
  if (!brand) notFound();

  return (
    <div>
      <div className="relative h-[55vh] w-full overflow-hidden bg-giuseppe-line sm:h-[70vh]">
        {brand.heroImageUrl && (
          <Image src={brand.heroImageUrl} alt={brand.name} fill priority className="object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="editorial-container absolute bottom-8 left-0 right-0 text-giuseppe-bg">
          {brand.foundingBrand && (
            <span className="mb-3 inline-block bg-giuseppe-bg px-2 py-1 text-[10px] uppercase tracking-widest2 text-giuseppe-ink">
              Founding Brand
            </span>
          )}
          <h1 className="font-display text-4xl sm:text-6xl">{brand.name}</h1>
          {(brand.city || brand.country) && (
            <p className="mt-2 text-sm uppercase tracking-wide text-giuseppe-bg/80">
              {[brand.city, brand.country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>

      <div className="editorial-container grid grid-cols-1 gap-10 py-14 sm:py-20 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <p className="eyebrow mb-4">The Brand</p>
          <p className="max-w-2xl whitespace-pre-line text-lg leading-relaxed text-giuseppe-ink">
            {brand.story}
          </p>
        </div>
        <div>
          <p className="eyebrow mb-4">Details</p>
          <dl className="space-y-3 text-sm">
            {brand.country && (
              <div className="flex justify-between border-b border-giuseppe-line pb-2">
                <dt className="text-giuseppe-muted">Location</dt>
                <dd>{[brand.city, brand.country].filter(Boolean).join(", ")}</dd>
              </div>
            )}
            {brand.website && (
              <div className="flex justify-between border-b border-giuseppe-line pb-2">
                <dt className="text-giuseppe-muted">Website</dt>
                <dd>
                  <a href={brand.website} target="_blank" rel="noreferrer" className="link-underline">
                    Visit
                  </a>
                </dd>
              </div>
            )}
            {brand.instagram && (
              <div className="flex justify-between border-b border-giuseppe-line pb-2">
                <dt className="text-giuseppe-muted">Instagram</dt>
                <dd>{brand.instagram}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="editorial-container border-t border-giuseppe-line py-14 sm:py-20">
        <p className="eyebrow mb-3">Collection</p>
        <h2 className="mb-10 font-display text-3xl sm:text-4xl">{brand.name}&rsquo;s pieces</h2>
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {brand.products.map((p) => (
            <ProductCard
              key={p.id}
              product={{
                slug: p.slug,
                name: p.name,
                priceCents: p.priceCents,
                currency: p.currency,
                imageUrl: p.images[0]?.url ?? null,
                brandName: brand.name,
                isNewArrival: p.newArrival,
              }}
            />
          ))}
          {brand.products.length === 0 && (
            <p className="col-span-full text-sm text-giuseppe-muted">No published products yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
