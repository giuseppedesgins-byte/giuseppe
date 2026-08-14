import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminOverviewPage() {
  requireAdmin();

  const [pendingApplications, activeBrands, publishedProducts, orders, unfulfilledOrders] = await Promise.all([
    prisma.brandApplication.count({ where: { status: "PENDING" } }),
    prisma.brand.count({ where: { status: "ACTIVE" } }),
    prisma.product.count({ where: { status: "PUBLISHED" } }),
    prisma.order.count(),
    prisma.order.count({ where: { fulfillmentStatus: "UNFULFILLED", status: { in: ["PAID", "PROCESSING"] } } }),
  ]);

  const cards = [
    { label: "Pending applications", value: pendingApplications, href: "/admin/applications" },
    { label: "Active brands", value: activeBrands, href: "/admin/brands" },
    { label: "Published products", value: publishedProducts, href: "/admin/products" },
    { label: "Total orders", value: orders, href: "/admin/orders" },
    { label: "Awaiting fulfillment", value: unfulfilledOrders, href: "/admin/orders?fulfillment=UNFULFILLED" },
  ];

  return (
    <div>
      <h1 className="mb-8 font-display text-3xl">Overview</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="border border-giuseppe-line bg-white p-5 hover:border-giuseppe-ink">
            <p className="text-3xl font-display">{c.value}</p>
            <p className="mt-2 text-xs uppercase tracking-widest2 text-giuseppe-muted">{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
