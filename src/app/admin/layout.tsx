import Link from "next/link";

// NOTE: auth is enforced per-page via requireAdmin() (see lib/auth.ts), not here —
// this layout also wraps /admin/login, so gating at the layout level would redirect-loop.
const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/brands", label: "Brands" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/products/review", label: "Review queue" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/articles", label: "The Edit" },
  { href: "/admin/issues", label: "Issues" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-giuseppe-bg">
      <div className="border-b border-giuseppe-line bg-giuseppe-ink text-giuseppe-bg">
        <div className="editorial-container flex h-14 items-center justify-between">
          <Link href="/admin" className="font-display text-lg">
            Giuseppe Admin
          </Link>
          <nav className="flex gap-6">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-xs uppercase tracking-widest2 text-giuseppe-bg/80 hover:text-giuseppe-bg">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="editorial-container py-10">{children}</div>
    </div>
  );
}
