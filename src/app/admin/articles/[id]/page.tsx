import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArticleForm } from "../ArticleForm";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; saved?: string };
}) {
  requireAdmin();
  const [article, subjects] = await Promise.all([
    prisma.article.findUnique({ where: { id: params.id }, include: { subjects: { select: { id: true } } } }),
    prisma.editorialSubject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, brandId: true } }),
  ]);
  if (!article) notFound();

  const live = article.status === "PUBLISHED" && article.publishedAt && article.publishedAt <= new Date();
  const scheduled = article.status === "PUBLISHED" && article.publishedAt && article.publishedAt > new Date();

  return (
    <div>
      <div className="mb-6 flex max-w-3xl items-center justify-between">
        <h1 className="font-display text-3xl">Edit article</h1>
        {live && (
          <Link href={`/the-edit/${article.slug}`} target="_blank" className="text-xs uppercase tracking-widest2 underline">
            View live
          </Link>
        )}
      </div>
      <p className="mb-4 text-xs uppercase tracking-widest2 text-giuseppe-muted">
        Status: {scheduled ? "SCHEDULED" : article.status.replace("_", " ")}
      </p>
      {searchParams.saved && <p className="mb-4 max-w-3xl border border-giuseppe-ink p-3 text-sm">Saved.</p>}
      {searchParams.error && <p className="mb-4 max-w-3xl border border-red-700 p-3 text-sm text-red-700">{searchParams.error}</p>}
      <ArticleForm
        subjects={subjects}
        article={{
          id: article.id,
          title: article.title,
          dek: article.dek,
          body: article.body,
          category: article.category,
          status: article.status,
          publishedAt: article.publishedAt,
          featured: article.featured,
          authorName: article.authorName,
          coverImageUrl: article.coverImageUrl,
          coverImageAlt: article.coverImageAlt,
          coverImageCredit: article.coverImageCredit,
          disclosure: article.disclosure,
          subjectIds: article.subjects.map((s) => s.id),
        }}
      />
    </div>
  );
}
