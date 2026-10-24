import { prisma } from "@/lib/prisma";
import { ProductStatus, BrandStatus } from "@prisma/client";

/**
 * Read-side data access for public pages. Kept in one place so filtering/sorting
 * rules (e.g. "only PUBLISHED products from ACTIVE brands") aren't duplicated
 * across route files.
 */

/**
 * The ONE place that decides what's publicly visible. Only LIVE products from ACTIVE
 * brands are ever shown — OUT_OF_STOCK and PENDING_REACTIVATION are completely hidden
 * (not "Sold Out" labeled), per explicit business rule. Every public page (home,
 * Discover, brand storefronts, product pages, sitemap, search/category/featured/new-
 * arrivals) must filter through this function rather than querying status directly, so
 * this rule can never be accidentally bypassed in one surface.
 */
export function getPublishedProductsWhere() {
  return {
    status: ProductStatus.LIVE,
    brand: { status: BrandStatus.ACTIVE },
  } as const;
}

export async function getFeaturedProducts(limit = 8) {
  return prisma.product.findMany({
    where: { ...getPublishedProductsWhere(), featured: true },
    include: { images: true, brand: true },
    take: limit,
    orderBy: { createdAt: "desc" },
  });
}

export async function getNewArrivals(limit = 8) {
  return prisma.product.findMany({
    where: { ...getPublishedProductsWhere(), newArrival: true },
    include: { images: true, brand: true },
    take: limit,
    orderBy: { createdAt: "desc" },
  });
}

export async function getDiscoverProducts(filters: {
  category?: string;
  brand?: string;
  country?: string;
  maxPriceCents?: number;
  newArrivalsOnly?: boolean;
}) {
  return prisma.product.findMany({
    where: {
      ...getPublishedProductsWhere(),
      ...(filters.category ? { categories: { some: { slug: filters.category } } } : {}),
      ...(filters.brand ? { brand: { slug: filters.brand } } : {}),
      ...(filters.country ? { brand: { country: filters.country } } : {}),
      ...(filters.maxPriceCents ? { priceCents: { lte: filters.maxPriceCents } } : {}),
      ...(filters.newArrivalsOnly ? { newArrival: true } : {}),
    },
    include: { images: true, brand: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActiveBrands() {
  return prisma.brand.findMany({
    where: { status: BrandStatus.ACTIVE },
    orderBy: [{ foundingBrand: "desc" }, { name: "asc" }],
  });
}

/**
 * Brands holding a Founding 10 position. A position is only "filled" publicly when the brand
 * has been formally approved (status ACTIVE) — pending/suspended/removed brands never show.
 */
export async function getFoundingTen() {
  return prisma.brand.findMany({
    where: { status: BrandStatus.ACTIVE, foundingSlot: { not: null } },
    orderBy: { foundingSlot: "asc" },
    select: { id: true, slug: true, name: true, story: true, heroImageUrl: true, city: true, country: true, foundingSlot: true },
  });
}

export async function getBrandBySlug(slug: string) {
  return prisma.brand.findFirst({
    where: { slug, status: BrandStatus.ACTIVE },
    include: {
      products: {
        where: { status: ProductStatus.LIVE },
        include: { images: true },
        orderBy: { createdAt: "desc" },
      },
      shippingOptions: true,
    },
  });
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, ...getPublishedProductsWhere() },
    include: {
      images: { orderBy: { position: "asc" } },
      videos: { orderBy: { position: "asc" } },
      brand: { include: { shippingOptions: true } },
      categories: true,
    },
  });
}

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function getDistinctBrandCountries() {
  const brands = await prisma.brand.findMany({
    where: { status: BrandStatus.ACTIVE, country: { not: null } },
    select: { country: true },
    distinct: ["country"],
  });
  return brands.map((b) => b.country).filter(Boolean) as string[];
}
