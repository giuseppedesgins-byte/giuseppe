import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TABS = ["PENDING", "NEEDS_INFO", "APPROVED", "REJECTED"] as const;

export default async function AdminApplicationsPage({ searchParams }: { searchParams: { status?: string } }) {
  requireAdmin();
  const status = (searchParams.status ?? "PENDING") as (typeof TABS)[number];

  const applications = await prisma.brandApplication.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl">Applications</h1>
      <div className="mb-8 flex gap-6 border-b border-giuseppe-line text-sm">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/applications?status=${t}`}
            className={`pb-3 ${status === t ? "border-b-2 border-giuseppe-ink text-giuseppe-ink" : "text-giuseppe-muted"}`}
          >
            {t.replace("_", " ")}
          </Link>
        ))}
      </div>

      <div className="divide-y divide-giuseppe-line border-t border-giuseppe-line">
        {applications.map((app) => (
          <Link key={app.id} href={`/admin/applications/${app.id}`} className="flex items-center justify-between py-4 hover:bg-white">
            <div>
              <p className="font-body text-sm">{app.brandName}</p>
              <p className="text-xs text-giuseppe-muted">{app.founderName} · {app.city}, {app.country}</p>
            </div>
            <p className="text-xs text-giuseppe-muted">{app.createdAt.toLocaleDateString()}</p>
          </Link>
        ))}
        {applications.length === 0 && <p className="py-10 text-sm text-giuseppe-muted">No applications in this status.</p>}
      </div>
    </div>
  );
}
