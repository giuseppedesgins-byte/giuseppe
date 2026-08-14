import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSystemAdmin } from "@/lib/admin-helpers";
import { uniqueSlug } from "@/lib/slug";
import { emails } from "@/lib/email";
import { FOUNDING_BRAND_MONTHLY_PRICE_CENTS, FOUNDING_BRAND_TRIAL_MONTHS, DEFAULT_COMMISSION_BPS } from "@/lib/pricing";
import { randomBytes } from "crypto";

async function approveApplication(formData: FormData) {
  "use server";
  requireAdmin();
  const applicationId = String(formData.get("applicationId"));
  const foundingBrand = formData.get("foundingBrand") === "on";
  const admin = await getSystemAdmin();

  const application = await prisma.brandApplication.findUniqueOrThrow({ where: { id: applicationId } });
  const slug = await uniqueSlug(application.brandName, async (s) => Boolean(await prisma.brand.findUnique({ where: { slug: s } })));

  const brand = await prisma.brand.create({
    data: {
      slug,
      name: application.brandName,
      status: "DRAFT",
      story: application.brandStory,
      country: application.country,
      city: application.city,
      website: application.website,
      instagram: application.instagram,
      tiktok: application.tiktok,
      foundingBrand,
      commissionBps: DEFAULT_COMMISSION_BPS,
      heroImageUrl: application.productImageUrls[0] ?? null,
      logoUrl: application.productImageUrls[0] ?? null,
    },
  });

  if (application.countriesShippedTo.length > 0) {
    await prisma.shippingOption.create({
      data: { brandId: brand.id, region: "ALL", method: "Standard", costCents: 1500, trackingAvailable: application.trackingProvided ?? true },
    });
  }

  if (foundingBrand) {
    await prisma.membership.create({
      data: {
        brandId: brand.id,
        planName: "founding_brand",
        status: "TRIAL",
        trialEndsAt: new Date(Date.now() + FOUNDING_BRAND_TRIAL_MONTHS * 30 * 24 * 60 * 60 * 1000),
        monthlyPriceCents: FOUNDING_BRAND_MONTHLY_PRICE_CENTS,
        commissionBps: DEFAULT_COMMISSION_BPS,
      },
    });
  }

  await prisma.sellerPerformance.create({ data: { brandId: brand.id } });

  await prisma.sellerAccount.create({
    data: { brandId: brand.id, payoutEmail: application.email, portalToken: randomBytes(24).toString("hex") },
  });

  await prisma.brandApplication.update({
    where: { id: applicationId },
    data: { status: "APPROVED", brandId: brand.id },
  });

  await prisma.applicationReview.create({
    data: { applicationId, adminId: admin.id, action: "APPROVE", note: foundingBrand ? "Approved as Founding Brand." : "Approved." },
  });

  await emails.applicationAccepted(application.email, application.brandName);

  redirect(`/admin/brands/${brand.id}`);
}

async function rejectApplication(formData: FormData) {
  "use server";
  requireAdmin();
  const applicationId = String(formData.get("applicationId"));
  const admin = await getSystemAdmin();
  const application = await prisma.brandApplication.update({ where: { id: applicationId }, data: { status: "REJECTED" } });
  await prisma.applicationReview.create({ data: { applicationId, adminId: admin.id, action: "REJECT" } });
  await emails.applicationRejected(application.email, application.brandName);
  redirect(`/admin/applications/${applicationId}`);
}

async function requestInfo(formData: FormData) {
  "use server";
  requireAdmin();
  const applicationId = String(formData.get("applicationId"));
  const note = String(formData.get("note") ?? "");
  const admin = await getSystemAdmin();
  const application = await prisma.brandApplication.update({ where: { id: applicationId }, data: { status: "NEEDS_INFO" } });
  await prisma.applicationReview.create({ data: { applicationId, adminId: admin.id, action: "REQUEST_INFO", note } });
  await emails.applicationNeedsInfo(application.email, application.brandName, note);
  redirect(`/admin/applications/${applicationId}`);
}

async function addNote(formData: FormData) {
  "use server";
  requireAdmin();
  const applicationId = String(formData.get("applicationId"));
  const note = String(formData.get("note") ?? "");
  const admin = await getSystemAdmin();
  await prisma.applicationReview.create({ data: { applicationId, adminId: admin.id, action: "NOTE", note } });
  redirect(`/admin/applications/${applicationId}`);
}

export default async function AdminApplicationDetailPage({ params }: { params: { id: string } }) {
  requireAdmin();
  const application = await prisma.brandApplication.findUnique({
    where: { id: params.id },
    include: { reviews: { include: { admin: true }, orderBy: { createdAt: "desc" } }, brand: true },
  });
  if (!application) notFound();

  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="eyebrow mb-2">{application.status.replace("_", " ")}</p>
          <h1 className="font-display text-3xl">{application.brandName}</h1>
        </div>
        {application.brand && (
          <a href={`/admin/brands/${application.brand.id}`} className="text-xs uppercase tracking-widest2 underline">
            View brand
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <DetailSection title="Founder / Business">
            <Detail label="Founder" value={application.founderName} />
            <Detail label="Email" value={application.email} />
            <Detail label="Phone" value={application.phone} />
            <Detail label="Location" value={`${application.city}, ${application.country}`} />
            <Detail label="Website" value={application.website} />
            <Detail label="Instagram" value={application.instagram} />
            <Detail label="TikTok" value={application.tiktok} />
          </DetailSection>

          <DetailSection title="Brand">
            <Detail label="Story" value={application.brandStory} block />
            <Detail label="Year founded" value={application.yearFounded?.toString()} />
            <Detail label="Categories" value={application.productCategories.join(", ")} />
            <Detail label="Target customer" value={application.targetCustomer} block />
            <Detail label="Differentiation" value={application.differentiation} block />
            <Detail label="Why Giuseppe" value={application.whyJoinGiuseppe} block />
          </DetailSection>

          <DetailSection title="Product Verification">
            <Detail label="Image URLs" value={application.productImageUrls.join(", ")} block />
            <Detail label="Video URLs" value={application.productVideoUrls.join(", ")} block />
            <Detail label="Lookbook" value={application.lookbookUrl} />
            <Detail label="Materials" value={application.materials} block />
            <Detail label="Sizing" value={application.sizingInfo} block />
            <Detail
              label="Confirmations"
              value={[
                application.confirmProductsReal && "Products real",
                application.confirmPhotosAccurate && "Photos accurate",
                application.confirmAuthorizedToSell && "Authorized to sell",
                application.confirmNotCounterfeit && "Not counterfeit",
                application.confirmInfoTruthful && "Info truthful",
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          </DetailSection>

          <DetailSection title="Fulfillment Readiness">
            <Detail label="Inventory model" value={application.inventoryModel ?? undefined} />
            <Detail label="Processing time" value={application.avgProcessingTime} />
            <Detail label="Shipping time" value={application.avgShippingTime} />
            <Detail label="Countries shipped" value={application.countriesShippedTo.join(", ")} />
            <Detail label="Carriers" value={application.shippingCarriers.join(", ")} />
            <Detail label="Tracking provided" value={application.trackingProvided ? "Yes" : "No"} />
            <Detail label="Max weekly capacity" value={application.maxWeeklyOrderCapacity?.toString()} />
            <Detail label="Support email" value={application.customerSupportEmail} />
            <Detail label="Return policy" value={application.returnPolicy} block />
            <Detail label="Refund policy" value={application.refundPolicy} block />
          </DetailSection>

          <DetailSection title="Manufacturing">
            <Detail label="Location" value={application.manufacturingLocation} />
            <Detail label="Type" value={application.manufacturingType} />
            <Detail label="Notes" value={application.manufacturingNotes} block />
          </DetailSection>
        </div>

        <div className="space-y-8">
          {application.status === "PENDING" || application.status === "NEEDS_INFO" ? (
            <div className="space-y-4 border border-giuseppe-line bg-white p-5">
              <p className="text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Review</p>
              <form action={approveApplication} className="space-y-3">
                <input type="hidden" name="applicationId" value={application.id} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="foundingBrand" /> Approve as Founding Brand
                </label>
                <button className="w-full bg-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">
                  Approve
                </button>
              </form>
              <form action={rejectApplication}>
                <input type="hidden" name="applicationId" value={application.id} />
                <button className="w-full border border-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2">
                  Reject
                </button>
              </form>
              <form action={requestInfo} className="space-y-2">
                <input type="hidden" name="applicationId" value={application.id} />
                <textarea name="note" placeholder="What's missing?" rows={3} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
                <button className="w-full border border-giuseppe-line px-4 py-2 text-[11px] uppercase tracking-widest2">
                  Request more information
                </button>
              </form>
            </div>
          ) : (
            <p className="border border-giuseppe-line bg-white p-5 text-sm text-giuseppe-muted">
              This application is {application.status.toLowerCase().replace("_", " ")}.
            </p>
          )}

          <div className="border border-giuseppe-line bg-white p-5">
            <p className="mb-3 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Internal notes</p>
            <form action={addNote} className="mb-4 space-y-2">
              <input type="hidden" name="applicationId" value={application.id} />
              <textarea name="note" placeholder="Add a note..." rows={2} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
              <button className="text-xs uppercase tracking-widest2 underline">Add note</button>
            </form>
            <div className="space-y-3">
              {application.reviews.map((r) => (
                <div key={r.id} className="border-t border-giuseppe-line pt-3 text-xs">
                  <p className="text-giuseppe-muted">
                    {r.admin.name} · {r.action} · {r.createdAt.toLocaleString()}
                  </p>
                  {r.note && <p className="mt-1">{r.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 font-display text-xl">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Detail({ label, value, block }: { label: string; value?: string | null; block?: boolean }) {
  if (!value) return null;
  return (
    <div className={block ? "" : "flex justify-between gap-4 border-b border-giuseppe-line pb-2 text-sm"}>
      <p className="text-[11px] uppercase tracking-widest2 text-giuseppe-muted">{label}</p>
      <p className={block ? "mt-1 whitespace-pre-line text-sm" : "text-right"}>{value}</p>
    </div>
  );
}
