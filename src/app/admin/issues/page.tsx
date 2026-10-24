import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * The "Issues/Cases" dashboard (spec §25) — every return, refund request, non-shipment
 * report, delivery dispute, defective/misrepresented claim, and seller-initiated
 * cancellation lands here as one OrderIssue row, regardless of who started it.
 */
export default async function AdminIssuesPage({ searchParams }: { searchParams: { status?: string } }) {
  requireAdmin();
  const status = searchParams.status;

  const issues = await prisma.orderIssue.findMany({
    where: status ? { status: status as any } : {},
    include: { order: { include: { brand: true } } },
    orderBy: { createdAt: "desc" },
  });

  const statuses = ["OPEN", "AWAITING_SELLER", "AWAITING_CUSTOMER", "ESCALATED", "RESOLVED", "CLOSED"];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl">Issues &amp; cases</h1>
      </div>
      <div className="mb-6 flex flex-wrap gap-4 text-xs">
        <Link href="/admin/issues" className={!status ? "underline" : "text-giuseppe-muted"}>All</Link>
        {statuses.map((s) => (
          <Link key={s} href={`/admin/issues?status=${s}`} className={status === s ? "underline" : "text-giuseppe-muted"}>
            {s.replace(/_/g, " ")}
          </Link>
        ))}
      </div>
      <div className="divide-y divide-giuseppe-line border-t border-giuseppe-line">
        {issues.map((iss) => (
          <Link key={iss.id} href={`/admin/issues/${iss.id}`} className="flex items-center justify-between py-4 hover:bg-white">
            <div>
              <p className="text-sm">
                {iss.order.orderNumber} — {iss.type.replace(/_/g, " ")}
              </p>
              <p className="text-xs text-giuseppe-muted">
                {iss.order.brand.name} · {iss.reasonCode?.replace(/_/g, " ") ?? "No reason code"} · {iss.createdAt.toLocaleDateString()}
                {iss.sellerFault === true && " · Seller fault"}
                {iss.sellerFault === false && " · Not seller fault"}
              </p>
            </div>
            <span className="text-xs uppercase tracking-widest2 text-giuseppe-muted">{iss.status.replace(/_/g, " ")}</span>
          </Link>
        ))}
        {issues.length === 0 && <p className="py-10 text-sm text-giuseppe-muted">No cases.</p>}
      </div>
    </div>
  );
}
