import Image from "next/image";
import Link from "next/link";
import { LinkButton } from "@/components/Button";
import { ProductCard } from "@/components/ProductCard";
import { BrandCard } from "@/components/BrandCard";
import { EmailSignupForm } from "@/components/EmailSignupForm";
import { getFeaturedProducts, getNewArrivals, getActiveBrands } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, newArrivals, brands] = await Promise.all([
    getFeaturedProducts(8),
    getNewArrivals(6),
    getActiveBrands(),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="editorial-container flex min-h-[85vh] flex-col justify-end pb-16 pt-24 sm:pt-32">
        <p className="eyebrow mb-6">Curated Global Discovery</p>
        <h1 className="font-display text-[15vw] leading-[0.92] tracking-tight text-giuseppe-ink sm:text-[9vw] lg:text-[7.5vw]">
          Giuseppe
        </h1>
        <p className="mt-3 font-display text-3xl italic text-giuseppe-ink sm:text-4xl">
          Beyond the Known.
        </p>
        <p className="mt-8 max-w-lg text-base leading-relaxed text-giuseppe-muted">
          Discover emerging designers, independent brands, and exceptional pieces from
          around the world — reviewed and selected by Giuseppe, not algorithms.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <LinkButton href="/discover">Discover Brands</LinkButton>
          <LinkButton href="/apply" variant="outline">
            Apply to Giuseppe
          </LinkButton>
        </div>
      </section>

      {/* Featured Discoveries */}
      <section className="editorial-container py-20 sm:py-28">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-3">Featured Discoveries</p>
            <h2 className="font-display text-3xl sm:text-4xl">Selected this season</h2>
          </div>
          <Link href="/discover" className="eyebrow link-underline hidden text-giuseppe-ink sm:inline">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard
              key={p.id}
              product={{
                slug: p.slug,
                name: p.name,
                priceCents: p.priceCents,
                currency: p.currency,
                imageUrl: p.images[0]?.url ?? null,
                brandName: p.brand.name,
                isNewArrival: p.newArrival,
              }}
            />
          ))}
          {featured.length === 0 && <EmptyStateNote label="No featured products yet — run `npm run db:seed`." />}
        </div>
      </section>

      {/* New on Giuseppe */}
      <section className="border-t border-giuseppe-line bg-giuseppe-panel py-20 sm:py-28">
        <div className="editorial-container">
          <p className="eyebrow mb-3">New on Giuseppe</p>
          <h2 className="mb-10 font-display text-3xl sm:text-4xl">Recently added designers</h2>
          <div className="grid grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {brands.slice(0, 4).map((b) => (
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
            {brands.length === 0 && <EmptyStateNote label="No brands yet — run `npm run db:seed`." />}
          </div>
        </div>
      </section>

      {/* Editorial */}
      <section className="editorial-container py-20 sm:py-28">
        <p className="eyebrow mb-3">Giuseppe Editorial</p>
        <h2 className="mb-10 font-display text-3xl sm:text-4xl">Notes on what we found</h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {newArrivals.slice(0, 3).map((p) => (
            <Link key={p.id} href={`/products/${p.slug}`} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden bg-giuseppe-line">
                {p.images[0] && (
                  <Image
                    src={p.images[0].url}
                    alt={p.name}
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.03]"
                  />
                )}
              </div>
              <p className="mt-4 font-display text-xl">{p.brand.name}</p>
              <p className="mt-1 text-sm text-giuseppe-muted">{p.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Brand application CTA */}
      <section className="border-y border-giuseppe-line bg-giuseppe-ink py-24 text-giuseppe-bg sm:py-32">
        <div className="editorial-container text-center">
          <p className="eyebrow mb-4 text-giuseppe-bg/60">For Designers</p>
          <h2 className="font-display text-3xl sm:text-5xl">
            Building something exceptional?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-giuseppe-bg/70">
            Apply to be discovered by Giuseppe.
          </p>
          <div className="mt-10">
            <LinkButton
              href="/apply"
              className="border border-giuseppe-bg !text-giuseppe-bg hover:bg-giuseppe-bg hover:!text-giuseppe-ink"
              variant="outline"
            >
              Apply to Giuseppe
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Email signup */}
      <section className="editorial-container py-20 text-center sm:py-28">
        <p className="eyebrow mb-4">Stay ahead of what&rsquo;s next.</p>
        <h2 className="mx-auto mb-8 max-w-md font-display text-2xl sm:text-3xl">
          Join the list for new discoveries, before anyone else.
        </h2>
        <div className="mx-auto max-w-sm">
          <EmailSignupForm />
        </div>
      </section>
    </div>
  );
}

function EmptyStateNote({ label }: { label: string }) {
  return <p className="col-span-full text-sm text-giuseppe-muted">{label}</p>;
}
