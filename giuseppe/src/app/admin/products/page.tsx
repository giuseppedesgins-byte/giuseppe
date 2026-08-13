import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/pricing";

export default async function AdminProductsPage({ searchParams }: { searchParams: { status?: string } }) {
  requireAdmin();
  const status = searchParams.status;
  const products = await prisma.product.findMany({
    where: status ? { status: status as any } : {},
    include: { brand: true },
    orderBy: { createdAt: "desc" },
  });

  const statuses = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "PUBLISHED", "UNPUBLISHED", "REJECTED"];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl">Products</h1>
        <Link href="/admin/products/new" className="border border-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2">
          + New product
        </Link>
      </div>
      <div className="mb-6 flex flex-wrap gap-4 text-xs">
        <Link href="/admin/products" className={!status ? "underline" : "text-giuseppe-muted"}>All</Link>
        {statuses.map((s) => (
          <Link key={s} href={`/admin/products?status=${s}`} className={status === s ? "underline" : "text-giuseppe-muted"}>
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>
      <div className="divide-y divide-giuseppe-line border-t border-giuseppe-line">
        {products.map((p) => (
          <Link key={p.id} href={`/admin/products/${p.id}`} className="flex items-center justify-between py-4 hover:bg-white">
            <div>
              <p className="text-sm">{p.name}</p>
              <p className="text-xs text-giuseppe-muted">
                {p.brand.name} · {formatPrice(p.priceCents, p.currency)} {p.featured && "· Featured"} {p.newArrival && "· New"}
              </p>
            </div>
            <span className="text-xs uppercase tracking-widest2 text-giuseppe-muted">{p.status}</span>
          </Link>
        ))}
        {products.length === 0 && <p className="py-10 text-sm text-giuseppe-muted">No products.</p>}
      </div>
    </div>
  );
}
