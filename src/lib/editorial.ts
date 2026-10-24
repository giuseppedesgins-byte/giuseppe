import { ArticleCategory, ArticleStatus, BrandStatus, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const CATEGORY_META: Record<ArticleCategory, { slug: string; label: string; blurb: string }> = {
  THE_RADAR: { slug: "the-radar", label: "The Radar", blurb: "Emerging brands, designers, and collections worth knowing." },
  DESIGNER_STORIES: { slug: "designer-stories", label: "Designer Stories", blurb: "Interviews, creative journeys, and behind-the-scenes perspectives." },
  CULTURE: { slug: "culture", label: "Culture", blurb: "Where fashion meets art, music, photography, and identity." },
  THE_PERSPECTIVE: { slug: "the-perspective", label: "The Perspective", blurb: "Opinion, analysis, and thoughtful conversation about fashion." },
  GIUSEPPE_NOTES: { slug: "giuseppe-notes", label: "Giuseppe Notes", blurb: "Platform announcements, designer opportunities, and updates." },
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_META) as ArticleCategory[];

export function categoryFromSlug(slug?: string): ArticleCategory | undefined {
  return CATEGORY_ORDER.find((c) => CATEGORY_META[c].slug === slug);
}

export const EDITORIAL_INDEPENDENCE_NOTE =
  "The Edit is editorially independent. Being a Giuseppe designer does not guarantee coverage, and coverage does not imply a partnership, endorsement, or that a designer's work is sold through Giuseppe.";

/** Public = published AND publish date reached. A future publishedAt means "scheduled". */
export function publicArticleWhere() {
  return { status: ArticleStatus.PUBLISHED, publishedAt: { lte: new Date() } };
}

const listSelect = {
  id: true,
  slug: true,
  title: true,
  dek: true,
  category: true,
  publishedAt: true,
  coverImageUrl: true,
  coverImageAlt: true,
  authorName: true,
  featured: true,
  issue: true,
} as const;

export async function getEditHome(category?: ArticleCategory) {
  const where = { ...publicArticleWhere(), ...(category ? { category } : {}) };
  const articles = await prisma.article.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    select: listSelect,
    take: 40,
  });
  const lead = articles.find((a) => a.featured) ?? articles[0] ?? null;
  const rest = articles.filter((a) => a.id !== lead?.id);
  return { lead, rest };
}

export async function getPublicArticle(slug: string) {
  return prisma.article.findFirst({
    where: { slug, ...publicArticleWhere() },
    include: {
      subjects: {
        include: {
          brand: {
            select: {
              slug: true,
              name: true,
              status: true,
              products: {
                where: { status: ProductStatus.LIVE },
                take: 4,
                orderBy: { createdAt: "desc" },
                select: { slug: true, name: true, images: { take: 1, select: { url: true } } },
              },
            },
          },
        },
      },
    },
  });
}

/** A subject is a Giuseppe marketplace designer only if linked to an ACTIVE brand. */
export function isMarketplaceSubject(subject: { brand: { status: BrandStatus } | null }) {
  return subject.brand?.status === BrandStatus.ACTIVE;
}

export async function getRelatedArticles(articleId: string, category: ArticleCategory, subjectIds: string[]) {
  const sharedSubject = subjectIds.length
    ? await prisma.article.findMany({
        where: { ...publicArticleWhere(), id: { not: articleId }, subjects: { some: { id: { in: subjectIds } } } },
        orderBy: { publishedAt: "desc" },
        select: listSelect,
        take: 3,
      })
    : [];
  if (sharedSubject.length >= 3) return sharedSubject;
  const fill = await prisma.article.findMany({
    where: {
      ...publicArticleWhere(),
      id: { notIn: [articleId, ...sharedSubject.map((a) => a.id)] },
      category,
    },
    orderBy: { publishedAt: "desc" },
    select: listSelect,
    take: 3 - sharedSubject.length,
  });
  return [...sharedSubject, ...fill];
}

export function formatArticleDate(d: Date | null) {
  if (!d) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
