import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/brand";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, brands, products] = await Promise.all([
    prisma.article.findMany({ where: { status: "PUBLISHED", publishedAt: { lte: new Date() } }, select: { slug: true, updatedAt: true } }),
    prisma.brand.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    prisma.product.findMany({ where: { status: "LIVE" }, select: { slug: true, updatedAt: true } }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/discover`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/brands`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/apply`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/founding-10`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/our-world`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/the-edit`, changeFrequency: "weekly", priority: 0.6 },
  ];

  const articleRoutes: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${SITE_URL}/the-edit/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const brandRoutes: MetadataRoute.Sitemap = brands.map((b) => ({
    url: `${SITE_URL}/brands/${b.slug}`,
    lastModified: b.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/products/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...articleRoutes, ...brandRoutes, ...productRoutes];
}
