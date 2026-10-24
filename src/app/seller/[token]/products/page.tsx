import Link from "next/link";
import { getSellerAccountByToken } from "@/lib/seller";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/pricing";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  NEEDS_CHANGES: "Needs changes",
  APPROVED: "Approved",
  LIVE: "Live",
  OUT_OF_STOCK: "Out of stock",
  PENDING_REACTIVATION: "Pending reactivation",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

/**
 * Every product a seller has ever proposed, grouped by status — including OUT_OF_STOCK
 * and PENDING_REACTIVATION items, which are completely invisible to customers but must
 * stay visible to the seller who owns them (spec §4). Sellers cannot publish anything
 * directly; every status change either happens automatically (out-of-stock/reactivation
 * request) or goes through Giuseppe review.
 */
export default async function SellerProductsPage({ params, searchParams }: { params: { token: string }; searchParams: { status?: string } }) {
  const sellerAccount = await getSellerAccountByToken(params.token);
  const status = searchParams.status;

  const products = await prisma.product.findMany({
    where: { brandId: sellerAccount.brandId, ...(status ? { status: status as any } : {}) },
    include: { images: true },
    orderBy: { updatedAt: "desc" },
  });

  const statuses = Object.keys(STATUS_LABELS);

  return (
    <div className="editorial-container py-14 sm:py-20">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="eyebrow mb-2">Seller Portal</p>
          <h1 className="font-display text-3xl">Products</h1>
        </div>
        <Link href={`/seller/${params.token}/products/new`} className="bg-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">
          + Propose a product
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap gap-4 text-xs">
        <Link href={`/seller/${params.token}/products`} className={!status ? "underline" : "text-giuseppe-muted"}>
          All
        </Link>
        {statuses.map((s) => (
          <Link key={s} href={`/seller/${params.token}/products?status=${s}`} className={status === s ? "underline" : "text-giuseppe-muted"}>
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      <div className="divide-y divide-giuseppe-line border-t border-giuseppe-line">
        {products.map((p) => (
          <Link key={p.id} href={`/seller/${params.token}/products/${p.id}`} className="flex items-center gap-4 py-4 hover:bg-white">
            {p.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.images[0].url} alt="" className="h-14 w-14 object-cover" />
            ) : (
              <div className="h-14 w-14 border border-giuseppe-line bg-giuseppe-bg" />
            )}
            <div className="flex-1">
              <p className="text-sm">{p.name}</p>
              <p className="text-xs text-giuseppe-muted">
                {formatPrice(p.priceCents, p.currency)}
                {p.inventoryQuantity !== null && ` · ${p.inventoryQuantity} in stock`}
                {p.madeToOrder && " · Made to order"}
              </p>
            </div>
            <span className="text-xs uppercase tracking-widest2 text-giuseppe-muted">{STATUS_LABELS[p.status]}</span>
          </Link>
        ))}
        {products.length === 0 && <p className="py-10 text-sm text-giuseppe-muted">No products yet — propose your first one.</p>}
      </div>
    </div>
  );
}
