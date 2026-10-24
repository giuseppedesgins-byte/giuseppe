import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubjectForm } from "../SubjectForm";

export const dynamic = "force-dynamic";

export default async function EditSubjectPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; saved?: string };
}) {
  requireAdmin();
  const subject = await prisma.editorialSubject.findUnique({ where: { id: params.id } });
  if (!subject) notFound();
  const [brands, linked] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.editorialSubject.findMany({ where: { brandId: { not: null }, NOT: { id: subject.id } }, select: { brandId: true } }),
  ]);
  const taken = new Set(linked.map((l) => l.brandId));
  const available = brands.filter((b) => !taken.has(b.id));

  return (
    <div>
      <div className="mb-6 flex max-w-2xl items-center justify-between">
        <h1 className="font-display text-3xl">{subject.name}</h1>
        <Link href="/admin/subjects" className="text-xs uppercase tracking-widest2 underline">
          All subjects
        </Link>
      </div>
      {searchParams.saved && <p className="mb-4 max-w-2xl border border-giuseppe-ink p-3 text-sm">Saved.</p>}
      {searchParams.error && <p className="mb-4 max-w-2xl border border-red-700 p-3 text-sm text-red-700">{searchParams.error}</p>}
      <SubjectForm
        brands={available}
        subject={{
          id: subject.id,
          name: subject.name,
          location: subject.location,
          bio: subject.bio,
          website: subject.website,
          instagram: subject.instagram,
          imageUrl: subject.imageUrl,
          imageCredit: subject.imageCredit,
          brandId: subject.brandId,
        }}
      />
    </div>
  );
}
