import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminBrandsPage() {
  requireAdmin();
  const brands = await prisma.brand.findMany({ orderBy: { createdAt: "desc" }, include: { sellerPerformance: true } });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl">Brands</h1>
        <Link href="/admin/brands/new" className="border border-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2">
          + New brand
        </Link>
      </div>
      <div className="divide-y divide-giuseppe-line border-t border-giuseppe-line">
        {brands.map((b) => (
          <Link key={b.id} href={`/admin/brands/${b.id}`} className="flex items-center justify-between py-4 hover:bg-white">
            <div>
              <p className="font-body text-sm">
                {b.name} {b.foundingBrand && <span className="ml-2 text-[10px] uppercase tracking-widest2 text-giuseppe-muted">Founding</span>}
              </p>
              <p className="text-xs text-giuseppe-muted">
                {b.country ?? "—"} · {b.sellerPerformance?.standing.replace("_", " ") ?? "Good standing"}
              </p>
            </div>
            <span className="text-xs uppercase tracking-widest2 text-giuseppe-muted">{b.status}</span>
          </Link>
        ))}
        {brands.length === 0 && <p className="py-10 text-sm text-giuseppe-muted">No brands yet.</p>}
      </div>
    </div>
  );
}
