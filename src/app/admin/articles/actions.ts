"use server";

import { redirect } from "next/navigation";
import { ArticleCategory, ArticleStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify, uniqueSlug } from "@/lib/slug";

const CATEGORIES = Object.values(ArticleCategory) as string[];

function clean(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s || null;
}

function isHttps(url: string | null) {
  return !url || /^https:\/\//i.test(url);
}

/**
 * One action for every button on the article form. `intent` decides the status:
 *   draft | review | publish | unpublish
 * "publish" with a future date = scheduled (the article becomes public automatically once that
 * time passes; no cron needed). Dates are entered and stored as UTC.
 */
export async function saveArticle(formData: FormData) {
  requireAdmin();
  const id = clean(formData.get("id"));
  const intent = String(formData.get("intent") || "draft");
  const back = (q: string) => redirect(id ? `/admin/articles/${id}?${q}` : `/admin/articles/new?${q}`);

  const title = clean(formData.get("title"));
  const body = clean(formData.get("body"));
  const category = String(formData.get("category") || "");
  if (!title || !body) return back("error=Title+and+body+are+required.");
  if (!CATEGORIES.includes(category)) return back("error=Choose+a+category.");

  const coverImageUrl = clean(formData.get("coverImageUrl"));
  const coverImageCredit = clean(formData.get("coverImageCredit"));
  if (!isHttps(coverImageUrl)) return back("error=Cover+image+URL+must+start+with+https%3A%2F%2F.");
  if (coverImageUrl && !coverImageCredit) {
    return back("error=Add+a+photo+credit+or+licence+note+for+the+cover+image.");
  }

  const issueRaw = clean(formData.get("issue"));
  const issueNum = issueRaw ? Number(issueRaw) : null;
  if (issueNum !== null && (!Number.isInteger(issueNum) || issueNum < 1)) return back("error=Issue+must+be+a+whole+number+like+1.");

  const subjectIds = formData.getAll("subjectIds").map(String);

  const existing = id ? await prisma.article.findUnique({ where: { id } }) : null;
  // "Save" keeps whatever status the article already has (new articles start as drafts).
  let status: ArticleStatus = existing?.status ?? ArticleStatus.DRAFT;
  let publishedAt: Date | null = existing?.publishedAt ?? null;

  if (intent === "review") status = ArticleStatus.IN_REVIEW;
  if (intent === "unpublish") status = ArticleStatus.UNPUBLISHED;
  if (intent === "publish") {
    status = ArticleStatus.PUBLISHED;
    const raw = clean(formData.get("publishedAt")); // datetime-local, e.g. 2026-10-30T14:30 (treated as UTC)
    publishedAt = raw ? new Date(`${raw}:00Z`) : existing?.publishedAt ?? new Date();
    if (Number.isNaN(publishedAt.getTime())) return back("error=That+publish+date+isn%27t+valid.");
  }

  const data = {
    title,
    dek: clean(formData.get("dek")),
    body,
    category: category as ArticleCategory,
    status,
    publishedAt,
    featured: formData.get("featured") === "on",
    authorName: clean(formData.get("authorName")),
    issue: issueNum,
    metaTitle: clean(formData.get("metaTitle")),
    metaDescription: clean(formData.get("metaDescription")),
    coverImageUrl,
    coverImageAlt: clean(formData.get("coverImageAlt")),
    coverImageCredit,
    disclosure: clean(formData.get("disclosure")),
    subjects: { set: subjectIds.map((sid) => ({ id: sid })) },
  };

  let articleId = id;
  if (id) {
    // Only one lead story at a time.
    if (data.featured) await prisma.article.updateMany({ where: { id: { not: id }, featured: true }, data: { featured: false } });
    await prisma.article.update({ where: { id }, data });
  } else {
    const slug = await uniqueSlug(title, async (s) => Boolean(await prisma.article.findUnique({ where: { slug: s } })));
    if (data.featured) await prisma.article.updateMany({ where: { featured: true }, data: { featured: false } });
    const { subjects: _unused, ...rest } = data;
    const created = await prisma.article.create({
      data: { ...rest, slug, subjects: { connect: subjectIds.map((sid) => ({ id: sid })) } },
    });
    articleId = created.id;
  }
  redirect(`/admin/articles/${articleId}?saved=${intent}`);
}

export async function saveSubject(formData: FormData) {
  requireAdmin();
  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  const back = (q: string) => redirect(id ? `/admin/subjects/${id}?${q}` : `/admin/subjects?${q}`);
  if (!name) return back("error=Name+is+required.");

  const brandId = clean(formData.get("brandId"));
  if (brandId) {
    const taken = await prisma.editorialSubject.findFirst({ where: { brandId, ...(id ? { NOT: { id } } : {}) } });
    if (taken) return back("error=That+Giuseppe+brand+is+already+linked+to+another+subject.");
  }
  const website = clean(formData.get("website"));
  if (website && !/^https?:\/\//i.test(website)) return back("error=Website+must+start+with+http%3A%2F%2F+or+https%3A%2F%2F.");

  const data = {
    name,
    location: clean(formData.get("location")),
    bio: clean(formData.get("bio")),
    website,
    instagram: clean(formData.get("instagram")),
    imageUrl: clean(formData.get("imageUrl")),
    imageCredit: clean(formData.get("imageCredit")),
    brandId,
  };

  if (id) {
    await prisma.editorialSubject.update({ where: { id }, data });
    redirect(`/admin/subjects/${id}?saved=1`);
  }
  const slug = await uniqueSlug(slugify(name) || "subject", async (s) => Boolean(await prisma.editorialSubject.findUnique({ where: { slug: s } })));
  const created = await prisma.editorialSubject.create({ data: { ...data, slug } });
  redirect(`/admin/subjects/${created.id}?saved=1`);
}
