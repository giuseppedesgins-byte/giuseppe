import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArticleForm } from "../ArticleForm";

export const dynamic = "force-dynamic";

export default async function NewArticlePage({ searchParams }: { searchParams: { error?: string } }) {
  requireAdmin();
  const subjects = await prisma.editorialSubject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, brandId: true } });
  return (
    <div>
      <h1 className="mb-8 font-display text-3xl">New article</h1>
      {searchParams.error && <p className="mb-4 max-w-3xl border border-red-700 p-3 text-sm text-red-700">{searchParams.error}</p>}
      <ArticleForm subjects={subjects} />
    </div>
  );
}
