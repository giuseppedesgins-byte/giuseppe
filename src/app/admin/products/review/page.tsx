import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/pricing";

/**
 * Triage queue for everything actually waiting on a Giuseppe decision: new proposals,
 * reactivation requests, and pending material-change requests on already-live products.
 * NEEDS_CHANGES products are excluded — those are waiting on the seller to resubmit, not
 * on us (they still show up in the general /admin/products list under that filter).
 */
export default async function ProductReviewQueuePage() {
  requireAdmin();

  const [proposals, reactivations, updateRequests] = await Promise.all([
    prisma.product.findMany({ where: { status: "PENDING_REVIEW" }, include: { brand: true, images: true }, orderBy: { createdAt: "asc" } }),
    prisma.product.findMany({ where: { status: "PENDING_REACTIVATION" }, include: { brand: true, images: true }, orderBy: { updatedAt: "asc" } }),
    prisma.productUpdateRequest.findMany({
      where: { status: "PENDING" },
      include: { product: { include: { brand: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="max-w-3xl space-y-12">
      <div>
        <p className="eyebrow mb-2">Admin</p>
        <h1 className="font-display text-3xl">Product review queue</h1>
      </div>

      <Section title={`New proposals (${proposals.length})`}>
        {proposals.map((p) => (
          <ProductRow key={p.id} id={p.id} name={p.name} brandName={p.brand.name} priceCents={p.priceCents} currency={p.currency} imageUrl={p.images[0]?.url} />
        ))}
        {proposals.length === 0 && <Empty label="No new proposals waiting." />}
      </Section>

      <Section title={`Reactivation requests (${reactivations.length})`}>
        {reactivations.map((p) => (
          <ProductRow key={p.id} id={p.id} name={p.name} brandName={p.brand.name} priceCents={p.priceCents} currency={p.currency} imageUrl={p.images[0]?.url} />
        ))}
        {reactivations.length === 0 && <Empty label="No reactivation requests waiting." />}
      </Section>

      <Section title={`Update requests on live products (${updateRequests.length})`}>
        {updateRequests.map((r) => (
          <ProductRow
            key={r.id}
            id={r.product.id}
            name={r.product.name}
            brandName={r.product.brand.name}
            priceCents={r.product.priceCents}
            currency={r.product.currency}
            note="Proposed changes pending"
          />
        ))}
        {updateRequests.length === 0 && <Empty label="No pending update requests." />}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 font-display text-xl">{title}</h2>
      <div className="divide-y divide-giuseppe-line border-t border-giuseppe-line">{children}</div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="py-6 text-sm text-giuseppe-muted">{label}</p>;
}

function ProductRow({
  id,
  name,
  brandName,
  priceCents,
  currency,
  imageUrl,
  note,
}: {
  id: string;
  name: string;
  brandName: string;
  priceCents: number;
  currency: string;
  imageUrl?: string;
  note?: string;
}) {
  return (
    <Link href={`/admin/products/${id}`} className="flex items-center gap-4 py-4 hover:bg-white">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-14 w-14 object-cover" />
      ) : (
        <div className="h-14 w-14 border border-giuseppe-line bg-giuseppe-bg" />
      )}
      <div className="flex-1">
        <p className="text-sm">{name}</p>
        <p className="text-xs text-giuseppe-muted">
          {brandName} · {formatPrice(priceCents, currency)} {note && `· ${note}`}
        </p>
      </div>
    </Link>
  );
}
