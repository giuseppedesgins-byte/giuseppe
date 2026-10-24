import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubjectForm } from "./SubjectForm";

export const dynamic = "force-dynamic";

export default async function AdminSubjectsPage({ searchParams }: { searchParams: { error?: string } }) {
  requireAdmin();
  const [subjects, linked, brands] = await Promise.all([
    prisma.editorialSubject.findMany({ orderBy: { name: "asc" }, include: { brand: { select: { name: true, status: true } } } }),
    prisma.editorialSubject.findMany({ where: { brandId: { not: null } }, select: { brandId: true } }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const linkedIds = new Set(linked.map((l) => l.brandId));
  const available = brands.filter((b) => !linkedIds.has(b.id));

  return (
    <div className="max-w-4xl space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Editorial subjects</h1>
        <Link href="/admin/articles" className="text-xs uppercase tracking-widest2 underline">
          Articles
        </Link>
      </div>
      <p className="max-w-2xl text-sm text-giuseppe-muted">
        Subjects are the designers, brands, or movements articles are about. Anyone can be a subject, whether or not they sell on
        Giuseppe. Editorial coverage is independent of marketplace membership.
      </p>

      {subjects.length > 0 && (
        <ul className="divide-y divide-giuseppe-line border border-giuseppe-line bg-white">
          {subjects.map((s) => (
            <li key={s.id}>
              <Link href={`/admin/subjects/${s.id}`} className="flex items-center justify-between p-4 hover:bg-giuseppe-bg">
                <span className="font-display text-lg">{s.name}</span>
                <span className="text-[11px] uppercase tracking-widest2">
                  {s.brand ? `Giuseppe designer (${s.brand.status})` : "Editorial only"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div>
        <h2 className="mb-4 font-display text-2xl">Add subject</h2>
        {searchParams.error && <p className="mb-4 max-w-2xl border border-red-700 p-3 text-sm text-red-700">{searchParams.error}</p>}
        <SubjectForm brands={available} />
      </div>
    </div>
  );
}
