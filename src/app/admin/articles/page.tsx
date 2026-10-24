import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORY_META, formatArticleDate } from "@/lib/editorial";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  requireAdmin();
  const articles = await prisma.article.findMany({ orderBy: { updatedAt: "desc" } });
  const now = new Date();

  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl">The Edit: articles</h1>
        <div className="flex gap-3">
          <Link href="/admin/subjects" className="border border-giuseppe-ink px-5 py-3 text-[11px] uppercase tracking-widest2">
            Subjects
          </Link>
          <Link href="/admin/articles/new" className="bg-giuseppe-ink px-5 py-3 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">
            New article
          </Link>
        </div>
      </div>
      {articles.length === 0 ? (
        <p className="text-sm text-giuseppe-muted">No articles yet.</p>
      ) : (
        <ul className="divide-y divide-giuseppe-line border border-giuseppe-line bg-white">
          {articles.map((a) => {
            const scheduled = a.status === "PUBLISHED" && a.publishedAt && a.publishedAt > now;
            return (
              <li key={a.id}>
                <Link href={`/admin/articles/${a.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-giuseppe-bg">
                  <span>
                    <span className="block font-display text-lg">{a.title}</span>
                    <span className="text-xs text-giuseppe-muted">
                      {CATEGORY_META[a.category].label}
                      {a.publishedAt && <> &middot; {formatArticleDate(a.publishedAt)}</>}
                    </span>
                  </span>
                  <span className="text-[11px] uppercase tracking-widest2">{scheduled ? "SCHEDULED" : a.status.replace("_", " ")}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
