import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSystemAdmin } from "@/lib/admin-helpers";
import { bpsToPercentLabel } from "@/lib/pricing";

async function updateBrand(formData: FormData) {
  "use server";
  requireAdmin();
  const id = String(formData.get("id"));
  await prisma.brand.update({
    where: { id },
    data: {
      name: String(formData.get("name")),
      legalName: String(formData.get("legalName") || "") || null,
      status: formData.get("status") as any,
      story: String(formData.get("story") || "") || null,
      country: String(formData.get("country") || "") || null,
      city: String(formData.get("city") || "") || null,
      website: String(formData.get("website") || "") || null,
      instagram: String(formData.get("instagram") || "") || null,
      tiktok: String(formData.get("tiktok") || "") || null,
      heroImageUrl: String(formData.get("heroImageUrl") || "") || null,
      logoUrl: String(formData.get("logoUrl") || "") || null,
      foundingBrand: formData.get("foundingBrand") === "on",
      commissionBps: Number(formData.get("commissionBps")) || 900,
      launchDate: formData.get("launchDate") ? new Date(String(formData.get("launchDate"))) : null,
      promotionRequirementConfirmed: formData.get("promotionRequirementConfirmed") === "on",
      promotionCompleted: formData.get("promotionCompleted") === "on",
      promotionUrl: String(formData.get("promotionUrl") || "") || null,
    },
  });
  redirect(`/admin/brands/${id}`);
}

async function addShippingOption(formData: FormData) {
  "use server";
  requireAdmin();
  const brandId = String(formData.get("brandId"));
  await prisma.shippingOption.create({
    data: {
      brandId,
      region: String(formData.get("region") || "ALL"),
      method: String(formData.get("method")),
      costCents: Math.round(Number(formData.get("cost")) * 100),
      estDeliveryDaysMin: Number(formData.get("min")) || null,
      estDeliveryDaysMax: Number(formData.get("max")) || null,
    },
  });
  redirect(`/admin/brands/${brandId}`);
}

async function addEnforcementAction(formData: FormData) {
  "use server";
  requireAdmin();
  const brandId = String(formData.get("brandId"));
  const admin = await getSystemAdmin();
  const severity = String(formData.get("severity")) as "MINOR" | "MODERATE" | "SEVERE";
  const action = String(formData.get("action"));
  const reason = String(formData.get("reason"));

  await prisma.enforcementAction.create({ data: { brandId, adminId: admin.id, severity, action, reason } });

  const standingMap: Record<string, string> = {
    "Warning issued": "WARNING",
    "Placed on probation": "PROBATION",
    Suspended: "SUSPENDED",
    "Permanently banned": "BANNED",
    "Restored to good standing": "GOOD_STANDING",
  };
  const standing = standingMap[action];
  if (standing) {
    await prisma.sellerPerformance.update({ where: { brandId }, data: { standing: standing as any } });
    if (standing === "SUSPENDED" || standing === "BANNED") {
      await prisma.brand.update({ where: { id: brandId }, data: { status: standing === "BANNED" ? "REMOVED" : "SUSPENDED" } });
    }
  }
  redirect(`/admin/brands/${brandId}`);
}

export default async function AdminBrandDetailPage({ params }: { params: { id: string } }) {
  requireAdmin();
  const brand = await prisma.brand.findUnique({
    where: { id: params.id },
    include: {
      products: true,
      shippingOptions: true,
      sellerPerformance: true,
      enforcementActions: { include: { admin: true }, orderBy: { createdAt: "desc" } },
      membership: true,
      sellerAccount: true,
    },
  });
  if (!brand) notFound();

  return (
    <div className="max-w-4xl space-y-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">{brand.name}</h1>
        <Link href={`/brands/${brand.slug}`} target="_blank" className="text-xs uppercase tracking-widest2 underline">
          View storefront
        </Link>
      </div>

      <form action={updateBrand} className="space-y-6 border border-giuseppe-line bg-white p-6">
        <input type="hidden" name="id" value={brand.id} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LabeledInput name="name" label="Name" defaultValue={brand.name} />
          <LabeledInput name="legalName" label="Legal name" defaultValue={brand.legalName ?? ""} />
          <LabeledInput name="country" label="Country" defaultValue={brand.country ?? ""} />
          <LabeledInput name="city" label="City" defaultValue={brand.city ?? ""} />
          <LabeledInput name="website" label="Website" defaultValue={brand.website ?? ""} />
          <LabeledInput name="instagram" label="Instagram" defaultValue={brand.instagram ?? ""} />
          <LabeledInput name="tiktok" label="TikTok" defaultValue={brand.tiktok ?? ""} />
          <LabeledInput name="heroImageUrl" label="Hero image URL" defaultValue={brand.heroImageUrl ?? ""} />
          <LabeledInput name="logoUrl" label="Logo URL" defaultValue={brand.logoUrl ?? ""} />
        </div>
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Brand story</span>
          <textarea name="story" rows={4} defaultValue={brand.story ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Status</span>
            <select name="status" defaultValue={brand.status} className="w-full border border-giuseppe-line px-3 py-2 text-sm">
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REMOVED">Removed</option>
            </select>
          </label>
          <LabeledInput name="commissionBps" label="Commission (bps, 900 = 9%)" defaultValue={String(brand.commissionBps)} />
          <LabeledInput name="launchDate" label="Launch date" type="date" defaultValue={brand.launchDate ? brand.launchDate.toISOString().slice(0, 10) : ""} />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="foundingBrand" defaultChecked={brand.foundingBrand} /> Founding Brand
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="promotionRequirementConfirmed" defaultChecked={brand.promotionRequirementConfirmed} /> 24-hour launch promotion requirement confirmed with brand
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="promotionCompleted" defaultChecked={brand.promotionCompleted} /> Promotion completed
          </label>
        </div>
        <LabeledInput name="promotionUrl" label="Promotion URL / screenshot link" defaultValue={brand.promotionUrl ?? ""} />

        <button className="bg-giuseppe-ink px-6 py-3 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">Save brand</button>
      </form>

      {brand.sellerAccount?.portalToken && (
        <div className="border border-giuseppe-line bg-white p-6 text-sm">
          <p className="mb-2 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Seller portal link</p>
          <p className="break-all text-giuseppe-muted">/seller/{brand.sellerAccount.portalToken}</p>
          <p className="mt-2 text-xs text-giuseppe-muted">Share directly with the brand — this link is their only access to view orders and add tracking (see README for auth caveats).</p>
        </div>
      )}

      {brand.membership && (
        <div className="border border-giuseppe-line bg-white p-6 text-sm">
          <p className="mb-2 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Membership</p>
          <p>
            {brand.membership.planName} · {brand.membership.status} · $
            {(brand.membership.monthlyPriceCents / 100).toFixed(2)}/mo · {bpsToPercentLabel(brand.membership.commissionBps)} commission
            {brand.membership.trialEndsAt && ` · trial ends ${brand.membership.trialEndsAt.toLocaleDateString()}`}
          </p>
        </div>
      )}

      <div className="border border-giuseppe-line bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Products ({brand.products.length})</p>
          <Link href={`/admin/products/new?brandId=${brand.id}`} className="text-xs uppercase tracking-widest2 underline">
            + Add product
          </Link>
        </div>
        <div className="divide-y divide-giuseppe-line">
          {brand.products.map((p) => (
            <Link key={p.id} href={`/admin/products/${p.id}`} className="flex items-center justify-between py-3 text-sm hover:underline">
              <span>{p.name}</span>
              <span className="text-xs uppercase tracking-widest2 text-giuseppe-muted">{p.status}</span>
            </Link>
          ))}
          {brand.products.length === 0 && <p className="py-4 text-sm text-giuseppe-muted">No products yet.</p>}
        </div>
      </div>

      <div className="border border-giuseppe-line bg-white p-6">
        <p className="mb-4 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Shipping options</p>
        <div className="mb-4 space-y-2 text-sm">
          {brand.shippingOptions.map((s) => (
            <p key={s.id}>
              {s.region} — {s.method}: ${(s.costCents / 100).toFixed(2)} ({s.estDeliveryDaysMin ?? "?"}-{s.estDeliveryDaysMax ?? "?"} days)
            </p>
          ))}
          {brand.shippingOptions.length === 0 && <p className="text-giuseppe-muted">None configured.</p>}
        </div>
        <form action={addShippingOption} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <input type="hidden" name="brandId" value={brand.id} />
          <input name="region" placeholder="Region (ALL)" className="border border-giuseppe-line px-2 py-1 text-sm" />
          <input name="method" required placeholder="Method" className="border border-giuseppe-line px-2 py-1 text-sm" />
          <input name="cost" required type="number" step="0.01" placeholder="Cost $" className="border border-giuseppe-line px-2 py-1 text-sm" />
          <input name="min" type="number" placeholder="Min days" className="border border-giuseppe-line px-2 py-1 text-sm" />
          <input name="max" type="number" placeholder="Max days" className="border border-giuseppe-line px-2 py-1 text-sm" />
          <button className="col-span-2 border border-giuseppe-ink px-3 py-1 text-xs uppercase tracking-widest2 sm:col-span-5">
            Add shipping option
          </button>
        </form>
      </div>

      <div className="border border-giuseppe-line bg-white p-6">
        <p className="mb-4 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">
          Seller performance — standing: {brand.sellerPerformance?.standing.replace("_", " ") ?? "Good standing"}
        </p>
        <div className="mb-6 grid grid-cols-3 gap-4 text-sm sm:grid-cols-6">
          <Stat label="Orders" value={brand.sellerPerformance?.totalOrders ?? 0} />
          <Stat label="Fulfilled" value={brand.sellerPerformance?.fulfilledOrders ?? 0} />
          <Stat label="Late" value={brand.sellerPerformance?.lateOrders ?? 0} />
          <Stat label="Cancelled" value={brand.sellerPerformance?.cancelledOrders ?? 0} />
          <Stat label="Refunds" value={brand.sellerPerformance?.refunds ?? 0} />
          <Stat label="Complaints" value={brand.sellerPerformance?.complaints ?? 0} />
        </div>

        <p className="mb-2 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Enforcement log</p>
        <div className="mb-4 space-y-2 text-xs">
          {brand.enforcementActions.map((a) => (
            <p key={a.id} className="border-t border-giuseppe-line pt-2">
              <span className="uppercase tracking-widest2 text-giuseppe-muted">{a.severity}</span> — {a.action} by {a.admin?.name ?? "Giuseppe"} on {a.createdAt.toLocaleDateString()}: {a.reason}
            </p>
          ))}
          {brand.enforcementActions.length === 0 && <p className="text-giuseppe-muted">No enforcement actions.</p>}
        </div>
        <form action={addEnforcementAction} className="space-y-2">
          <input type="hidden" name="brandId" value={brand.id} />
          <div className="grid grid-cols-2 gap-2">
            <select name="severity" className="border border-giuseppe-line px-2 py-1 text-sm">
              <option value="MINOR">Minor</option>
              <option value="MODERATE">Moderate</option>
              <option value="SEVERE">Severe</option>
            </select>
            <select name="action" className="border border-giuseppe-line px-2 py-1 text-sm">
              <option>Warning issued</option>
              <option>Placed on probation</option>
              <option>Suspended</option>
              <option>Permanently banned</option>
              <option>Restored to good standing</option>
            </select>
          </div>
          <textarea name="reason" required placeholder="Reason (e.g. counterfeit merchandise, repeated failure to ship...)" rows={2} className="w-full border border-giuseppe-line px-2 py-1 text-sm" />
          <button className="border border-giuseppe-ink px-3 py-1 text-xs uppercase tracking-widest2">Log enforcement action</button>
        </form>
      </div>
    </div>
  );
}

function LabeledInput({ name, label, defaultValue, type = "text" }: { name: string; label: string; defaultValue?: string; type?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-display text-xl">{value}</p>
      <p className="text-[10px] uppercase tracking-widest2 text-giuseppe-muted">{label}</p>
    </div>
  );
}
