import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { getDiscoverProducts, getCategories, getDistinctBrandCountries, getActiveBrands } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover",
  description: "Browse approved brands and products, curated by Giuseppe.",
};

const PRICE_TIERS = [
  { label: "Any price", value: "" },
  { label: "Under $100", value: "10000" },
  { label: "Under $250", value: "25000" },
  { label: "Under $500", value: "50000" },
];

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: { category?: string; brand?: string; country?: string; price?: string; new?: string };
}) {
  const [products, categories, countries, brands] = await Promise.all([
    getDiscoverProducts({
      category: searchParams.category,
      brand: searchParams.brand,
      country: searchParams.country,
      maxPriceCents: searchParams.price ? Number(searchParams.price) : undefined,
      newArrivalsOnly: searchParams.new === "1",
    }),
    getCategories(),
    getDistinctBrandCountries(),
    getActiveBrands(),
  ]);

  const activeFilters = { ...searchParams };

  function filterHref(next: Partial<typeof activeFilters>) {
    const params = new URLSearchParams();
    const merged = { ...activeFilters, ...next };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const qs = params.toString();
    return `/discover${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="editorial-container py-14 sm:py-20">
      <p className="eyebrow mb-3">Discover</p>
      <h1 className="mb-10 font-display text-4xl sm:text-5xl">All approved brands &amp; pieces</h1>

      {/* Filters — intentionally simple for V1: category, brand, country, price, new arrivals */}
      <div className="mb-12 flex flex-wrap gap-x-8 gap-y-4 border-b border-t border-giuseppe-line py-5 text-sm">
        <FilterGroup label="Category">
          <FilterLink active={!searchParams.category} href={filterHref({ category: undefined })}>All</FilterLink>
          {categories.map((c) => (
            <FilterLink key={c.slug} active={searchParams.category === c.slug} href={filterHref({ category: c.slug })}>
              {c.name}
            </FilterLink>
          ))}
        </FilterGroup>

        <FilterGroup label="Brand">
          <FilterLink active={!searchParams.brand} href={filterHref({ brand: undefined })}>All</FilterLink>
          {brands.map((b) => (
            <FilterLink key={b.slug} active={searchParams.brand === b.slug} href={filterHref({ brand: b.slug })}>
              {b.name}
            </FilterLink>
          ))}
        </FilterGroup>

        <FilterGroup label="Country">
          <FilterLink active={!searchParams.country} href={filterHref({ country: undefined })}>All</FilterLink>
          {countries.map((c) => (
            <FilterLink key={c} active={searchParams.country === c} href={filterHref({ country: c })}>
              {c}
            </FilterLink>
          ))}
        </FilterGroup>

        <FilterGroup label="Price">
          {PRICE_TIERS.map((t) => (
            <FilterLink key={t.value} active={(searchParams.price ?? "") === t.value} href={filterHref({ price: t.value || undefined })}>
              {t.label}
            </FilterLink>
          ))}
        </FilterGroup>

        <FilterGroup label="Arrivals">
          <FilterLink active={searchParams.new !== "1"} href={filterHref({ new: undefined })}>All</FilterLink>
          <FilterLink active={searchParams.new === "1"} href={filterHref({ new: "1" })}>New arrivals</FilterLink>
        </FilterGroup>
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
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
        {products.length === 0 && (
          <p className="col-span-full py-20 text-center text-sm text-giuseppe-muted">
            No products match these filters yet.
          </p>
        )}
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] uppercase tracking-widest2 text-giuseppe-muted">{label}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">{children}</div>
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={active ? "text-giuseppe-ink underline underline-offset-4" : "text-giuseppe-muted hover:text-giuseppe-ink"}
    >
      {children}
    </Link>
  );
}
