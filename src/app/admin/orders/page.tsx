import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/pricing";
import { sweepOrders } from "@/lib/order-sweep";

export default async function AdminOrdersPage({ searchParams }: { searchParams: { fulfillment?: string; status?: string } }) {
  requireAdmin();
  // Lazy sweep — see lib/order-sweep.ts. Releases stale reservations and flags overdue
  // shipments every time this list is viewed, since there's no scheduled job to do it.
  await sweepOrders();
  const orders = await prisma.order.findMany({
    where: {
      ...(searchParams.fulfillment ? { fulfillmentStatus: searchParams.fulfillment as any } : {}),
      ...(searchParams.status ? { status: searchParams.status as any } : {}),
    },
    include: { brand: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-8 font-display text-3xl">Orders</h1>
      <div className="divide-y divide-giuseppe-line border-t border-giuseppe-line">
        {orders.map((o) => (
          <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center justify-between py-4 hover:bg-white">
            <div>
              <p className="text-sm">{o.orderNumber} — {o.brand.name}</p>
              <p className="text-xs text-giuseppe-muted">{o.email} · {o.createdAt.toLocaleDateString()}</p>
            </div>
            <div className="text-right text-xs">
              <p className="uppercase tracking-widest2 text-giuseppe-muted">{o.status} / {o.fulfillmentStatus}</p>
              {o.neverShippedFlaggedAt && (
                <p className="mt-1 uppercase tracking-widest2 text-red-700">Overdue — never shipped</p>
              )}
              <p className="mt-1">{formatPrice(o.totalCents, o.currency)}</p>
            </div>
          </Link>
        ))}
        {orders.length === 0 && <p className="py-10 text-sm text-giuseppe-muted">No orders yet.</p>}
      </div>
    </div>
  );
}
