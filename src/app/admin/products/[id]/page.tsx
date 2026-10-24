import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSystemAdmin } from "@/lib/admin-helpers";
import { emails } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { ImageUploader } from "@/components/ImageUploader";

async function sellerEmailFor(brandId: string) {
  const sellerAccount = await prisma.sellerAccount.findUnique({ where: { brandId } });
  return sellerAccount?.payoutEmail ?? null;
}

async function updateProduct(formData: FormData) {
  "use server";
  requireAdmin();
  const id = String(formData.get("id"));
  const imageUrls = formData.getAll("imageUrls").map(String).filter(Boolean);

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        name: String(formData.get("name")),
        description: String(formData.get("description") || ""),
        priceCents: Math.round(Number(formData.get("price")) * 100),
        materials: String(formData.get("materials") || "") || null,
        sizingInfo: String(formData.get("sizingInfo") || "") || null,
        processingTime: String(formData.get("processingTime") || "") || null,
        returnPolicy: String(formData.get("returnPolicy") || "") || null,
        refundPolicy: String(formData.get("refundPolicy") || "") || null,
        featured: formData.get("featured") === "on",
        newArrival: formData.get("newArrival") === "on",
        finalSale: formData.get("finalSale") === "on",
        sku: String(formData.get("sku") || "") || null,
        madeToOrder: formData.get("madeToOrder") === "on",
        inventoryQuantity:
          formData.get("madeToOrder") === "on" || String(formData.get("inventoryQuantity") || "") === ""
            ? null
            : Math.max(0, Math.round(Number(formData.get("inventoryQuantity")))),
        adminNote: String(formData.get("adminNote") || "") || null,
        colorOptions: String(formData.get("colorOptions") || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        sizeOptions: String(formData.get("sizeOptions") || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    });

    // Newly uploaded images (from ImageUploader) are appended — existing ProductImage
    // rows added via the legacy URL field below are untouched.
    if (imageUrls.length > 0) {
      const existing = await tx.productImage.count({ where: { productId: id } });
      await tx.productImage.createMany({
        data: imageUrls.map((url, i) => ({ productId: id, url, position: existing + i })),
      });
    }
  });

  redirect(`/admin/products/${id}`);
}

async function addImage(formData: FormData) {
  "use server";
  requireAdmin();
  const productId = String(formData.get("productId"));
  const url = String(formData.get("url"));
  if (url) {
    await prisma.productImage.create({ data: { productId, url, altText: String(formData.get("altText") || "") } });
  }
  redirect(`/admin/products/${productId}`);
}

async function removeImage(formData: FormData) {
  "use server";
  requireAdmin();
  const imageId = String(formData.get("imageId"));
  const productId = String(formData.get("productId"));
  await prisma.productImage.delete({ where: { id: imageId } });
  redirect(`/admin/products/${productId}`);
}

async function approveProduct(formData: FormData) {
  "use server";
  requireAdmin();
  const id = String(formData.get("id"));
  const admin = await getSystemAdmin();
  const product = await prisma.product.findUniqueOrThrow({ where: { id } });

  await prisma.product.update({ where: { id }, data: { status: "LIVE", reviewedAt: new Date() } });
  await logAudit({
    entityType: "PRODUCT",
    entityId: id,
    action: "APPROVE",
    previousStatus: product.status,
    newStatus: "LIVE",
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.name,
  });

  const to = await sellerEmailFor(product.brandId);
  if (to) await emails.productApproved(to, product.name);

  redirect(`/admin/products/${id}`);
}

async function requestChanges(formData: FormData) {
  "use server";
  requireAdmin();
  const id = String(formData.get("id"));
  const note = String(formData.get("note") || "");
  const admin = await getSystemAdmin();
  const product = await prisma.product.findUniqueOrThrow({ where: { id } });

  await prisma.product.update({ where: { id }, data: { status: "NEEDS_CHANGES", adminNote: note, reviewedAt: new Date() } });
  await logAudit({
    entityType: "PRODUCT",
    entityId: id,
    action: "REQUEST_CHANGES",
    previousStatus: product.status,
    newStatus: "NEEDS_CHANGES",
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.name,
    reason: note,
  });

  const to = await sellerEmailFor(product.brandId);
  if (to) await emails.productNeedsChanges(to, product.name, note);

  redirect(`/admin/products/${id}`);
}

async function rejectProduct(formData: FormData) {
  "use server";
  requireAdmin();
  const id = String(formData.get("id"));
  const note = String(formData.get("note") || "");
  const admin = await getSystemAdmin();
  const product = await prisma.product.findUniqueOrThrow({ where: { id } });

  await prisma.product.update({ where: { id }, data: { status: "REJECTED", adminNote: note, reviewedAt: new Date() } });
  await logAudit({
    entityType: "PRODUCT",
    entityId: id,
    action: "REJECT",
    previousStatus: product.status,
    newStatus: "REJECTED",
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.name,
    reason: note,
  });

  const to = await sellerEmailFor(product.brandId);
  if (to) await emails.productRejected(to, product.name, note);

  redirect(`/admin/products/${id}`);
}

async function archiveProduct(formData: FormData) {
  "use server";
  requireAdmin();
  const id = String(formData.get("id"));
  const note = String(formData.get("note") || "");
  const admin = await getSystemAdmin();
  const product = await prisma.product.findUniqueOrThrow({ where: { id } });

  await prisma.product.update({ where: { id }, data: { status: "ARCHIVED", adminNote: note || product.adminNote } });
  await logAudit({
    entityType: "PRODUCT",
    entityId: id,
    action: "ARCHIVE",
    previousStatus: product.status,
    newStatus: "ARCHIVED",
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.name,
    reason: note,
  });

  redirect(`/admin/products/${id}`);
}

async function approveReactivation(formData: FormData) {
  "use server";
  requireAdmin();
  const id = String(formData.get("id"));
  const admin = await getSystemAdmin();
  const product = await prisma.product.findUniqueOrThrow({ where: { id } });

  await prisma.product.update({ where: { id }, data: { status: "LIVE", reviewedAt: new Date() } });
  await logAudit({
    entityType: "PRODUCT",
    entityId: id,
    action: "APPROVE_REACTIVATION",
    previousStatus: product.status,
    newStatus: "LIVE",
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.name,
  });

  const to = await sellerEmailFor(product.brandId);
  if (to) await emails.reactivationApproved(to, product.name);

  redirect(`/admin/products/${id}`);
}

async function denyReactivation(formData: FormData) {
  "use server";
  requireAdmin();
  const id = String(formData.get("id"));
  const note = String(formData.get("note") || "");
  const admin = await getSystemAdmin();
  const product = await prisma.product.findUniqueOrThrow({ where: { id } });

  await prisma.product.update({ where: { id }, data: { status: "OUT_OF_STOCK", adminNote: note } });
  await logAudit({
    entityType: "PRODUCT",
    entityId: id,
    action: "DENY_REACTIVATION",
    previousStatus: product.status,
    newStatus: "OUT_OF_STOCK",
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.name,
    reason: note,
  });

  const to = await sellerEmailFor(product.brandId);
  if (to) await emails.reactivationDenied(to, product.name, note);

  redirect(`/admin/products/${id}`);
}

async function reviewUpdateRequest(formData: FormData) {
  "use server";
  requireAdmin();
  const requestId = String(formData.get("requestId"));
  const productId = String(formData.get("productId"));
  const decision = String(formData.get("decision")); // "approve" | "reject"
  const note = String(formData.get("note") || "");
  const admin = await getSystemAdmin();

  const updateRequest = await prisma.productUpdateRequest.findUniqueOrThrow({ where: { id: requestId } });
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  if (decision === "approve") {
    const changes = updateRequest.proposedChanges as Record<string, unknown>;
    await prisma.$transaction([
      prisma.product.update({ where: { id: productId }, data: changes as any }),
      prisma.productUpdateRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", adminNote: note, reviewedByAdminId: admin.id, reviewedAt: new Date() },
      }),
    ]);
    await logAudit({
      entityType: "PRODUCT",
      entityId: productId,
      action: "APPROVE_UPDATE_REQUEST",
      actorType: "ADMIN",
      actorId: admin.id,
      actorLabel: admin.name,
      metadata: changes,
    });
  } else {
    await prisma.productUpdateRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", adminNote: note, reviewedByAdminId: admin.id, reviewedAt: new Date() },
    });
    await logAudit({
      entityType: "PRODUCT",
      entityId: productId,
      action: "REJECT_UPDATE_REQUEST",
      actorType: "ADMIN",
      actorId: admin.id,
      actorLabel: admin.name,
      reason: note,
    });
  }

  const to = await sellerEmailFor(product.brandId);
  if (to) await emails.productUpdateRequestReviewed(to, product.name, decision === "approve", note);

  redirect(`/admin/products/${productId}`);
}

export default async function AdminProductDetailPage({ params }: { params: { id: string } }) {
  requireAdmin();
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { brand: true, images: true },
  });
  if (!product) notFound();

  const updateRequests = await prisma.productUpdateRequest.findMany({
    where: { productId: product.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  const auditLog = await prisma.auditLogEntry.findMany({
    where: { entityType: "PRODUCT", entityId: product.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="max-w-2xl space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow mb-2">{product.brand.name}</p>
          <h1 className="font-display text-3xl">{product.name}</h1>
        </div>
        <span className="border border-giuseppe-line px-3 py-1 text-xs uppercase tracking-widest2 text-giuseppe-muted">
          {product.status.replace(/_/g, " ")}
        </span>
      </div>

      {/* --- Review actions, shown based on current status --- */}
      {(product.status === "PENDING_REVIEW" || product.status === "NEEDS_CHANGES") && (
        <div className="space-y-4 border border-giuseppe-line bg-white p-6">
          <p className="text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Review this submission</p>
          <form action={approveProduct}>
            <input type="hidden" name="id" value={product.id} />
            <button className="w-full bg-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">
              Approve &amp; publish
            </button>
          </form>
          <form action={requestChanges} className="space-y-2">
            <input type="hidden" name="id" value={product.id} />
            <textarea name="note" required placeholder="What needs to change?" rows={2} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
            <button className="w-full border border-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2">Request changes</button>
          </form>
          <form action={rejectProduct} className="space-y-2">
            <input type="hidden" name="id" value={product.id} />
            <textarea name="note" placeholder="Reason (optional, shared with seller)" rows={2} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
            <button className="w-full border border-red-700 px-4 py-2 text-[11px] uppercase tracking-widest2 text-red-700 hover:bg-red-700 hover:text-white">
              Reject
            </button>
          </form>
        </div>
      )}

      {product.status === "PENDING_REACTIVATION" && (
        <div className="space-y-4 border border-giuseppe-line bg-white p-6">
          <p className="text-[11px] uppercase tracking-widest2 text-giuseppe-muted">
            Seller requested reactivation — this listing is still hidden from customers until approved.
          </p>
          <form action={approveReactivation}>
            <input type="hidden" name="id" value={product.id} />
            <button className="w-full bg-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">
              Approve reactivation — make live
            </button>
          </form>
          <form action={denyReactivation} className="space-y-2">
            <input type="hidden" name="id" value={product.id} />
            <textarea name="note" placeholder="Why isn't this ready to relist?" rows={2} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
            <button className="w-full border border-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2">Deny — keep out of stock</button>
          </form>
        </div>
      )}

      {updateRequests.length > 0 && (
        <div className="space-y-4 border border-giuseppe-line bg-white p-6">
          <p className="text-[11px] uppercase tracking-widest2 text-giuseppe-muted">
            Pending update request{updateRequests.length > 1 ? "s" : ""} — the live listing stays as-is until approved
          </p>
          {updateRequests.map((r) => (
            <div key={r.id} className="space-y-3 border-t border-giuseppe-line pt-4 text-sm">
              <p className="text-giuseppe-muted">Submitted {r.createdAt.toLocaleString()}</p>
              {r.sellerNote && <p className="bg-giuseppe-bg p-3">{r.sellerNote}</p>}
              <pre className="overflow-x-auto whitespace-pre-wrap bg-giuseppe-bg p-3 text-xs">{JSON.stringify(r.proposedChanges, null, 2)}</pre>
              <div className="flex gap-2">
                <form action={reviewUpdateRequest} className="flex-1">
                  <input type="hidden" name="requestId" value={r.id} />
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <button className="w-full bg-giuseppe-ink px-3 py-2 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">Approve changes</button>
                </form>
                <form action={reviewUpdateRequest} className="flex-1">
                  <input type="hidden" name="requestId" value={r.id} />
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <button className="w-full border border-giuseppe-ink px-3 py-2 text-[11px] uppercase tracking-widest2">Reject changes</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <form action={updateProduct} className="space-y-6 border border-giuseppe-line bg-white p-6">
        <input type="hidden" name="id" value={product.id} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Name</span>
            <input name="name" defaultValue={product.name} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Price (USD)</span>
            <input name="price" type="number" step="0.01" defaultValue={(product.priceCents / 100).toFixed(2)} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
        </div>
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Description</span>
          <textarea name="description" rows={4} defaultValue={product.description} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Materials</span>
            <textarea name="materials" rows={2} defaultValue={product.materials ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Sizing</span>
            <textarea name="sizingInfo" rows={2} defaultValue={product.sizingInfo ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Processing time</span>
            <input name="processingTime" defaultValue={product.processingTime ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Return policy</span>
            <input name="returnPolicy" defaultValue={product.returnPolicy ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Refund policy</span>
            <input name="refundPolicy" defaultValue={product.refundPolicy ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Color options (comma-separated)</span>
            <input name="colorOptions" defaultValue={product.colorOptions.join(", ")} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Size options (comma-separated)</span>
            <input name="sizeOptions" defaultValue={product.sizeOptions.join(", ")} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">SKU</span>
            <input name="sku" defaultValue={product.sku ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Inventory quantity</span>
            <input
              name="inventoryQuantity"
              type="number"
              min={0}
              defaultValue={product.inventoryQuantity ?? ""}
              placeholder="Blank = not tracked"
              className="w-full border border-giuseppe-line px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input type="checkbox" name="madeToOrder" defaultChecked={product.madeToOrder} /> Made to order (no fixed stock)
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 pt-1 text-sm">
            <input type="checkbox" name="featured" defaultChecked={product.featured} /> Featured
          </label>
          <label className="flex items-center gap-2 pt-1 text-sm">
            <input type="checkbox" name="newArrival" defaultChecked={product.newArrival} /> New arrival
          </label>
          <label className="flex items-center gap-2 pt-1 text-sm">
            <input type="checkbox" name="finalSale" defaultChecked={product.finalSale} /> Final Sale (not eligible for returns except buyer-protection reasons)
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">
            Internal admin note (never shown to customers)
          </span>
          <textarea name="adminNote" rows={2} defaultValue={product.adminNote ?? ""} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
        </label>

        <div>
          <p className="mb-2 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Add photos</p>
          <ImageUploader brandId={product.brandId} fieldName="imageUrls" />
        </div>

        <button className="bg-giuseppe-ink px-6 py-3 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">Save product</button>
      </form>

      <div className="border border-giuseppe-line bg-white p-6">
        <p className="mb-4 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Images</p>
        <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {product.images.map((img) => (
            <div key={img.id} className="group relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.altText ?? ""} className="h-full w-full object-cover" />
              <form action={removeImage} className="absolute right-1 top-1 hidden group-hover:block">
                <input type="hidden" name="imageId" value={img.id} />
                <input type="hidden" name="productId" value={product.id} />
                <button className="bg-white px-1.5 py-0.5 text-[10px] uppercase tracking-widest2">Remove</button>
              </form>
            </div>
          ))}
        </div>
        <form action={addImage} className="flex gap-2">
          <input type="hidden" name="productId" value={product.id} />
          <input name="url" placeholder="Or paste an image URL" className="flex-1 border border-giuseppe-line px-3 py-2 text-sm" />
          <input name="altText" placeholder="Alt text" className="flex-1 border border-giuseppe-line px-3 py-2 text-sm" />
          <button className="border border-giuseppe-ink px-4 py-2 text-xs uppercase tracking-widest2">Add</button>
        </form>
      </div>

      {(product.status === "LIVE" || product.status === "OUT_OF_STOCK" || product.status === "REJECTED" || product.status === "ARCHIVED") && (
        <div className="border border-giuseppe-line bg-white p-6">
          <p className="mb-3 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Admin controls</p>
          {product.status !== "ARCHIVED" && (
            <form action={archiveProduct} className="space-y-2">
              <input type="hidden" name="id" value={product.id} />
              <textarea name="note" placeholder="Reason for taking this down permanently" rows={2} className="w-full border border-giuseppe-line px-3 py-2 text-sm" />
              <button className="w-full border border-red-700 px-4 py-2 text-[11px] uppercase tracking-widest2 text-red-700 hover:bg-red-700 hover:text-white">
                Archive (permanent takedown)
              </button>
            </form>
          )}
        </div>
      )}

      {auditLog.length > 0 && (
        <div className="border border-giuseppe-line bg-white p-6">
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">History</p>
          <div className="space-y-2 text-xs">
            {auditLog.map((a) => (
              <p key={a.id} className="border-t border-giuseppe-line pt-2 text-giuseppe-muted">
                {a.createdAt.toLocaleString()} — {a.action.replace(/_/g, " ")} by {a.actorLabel ?? a.actorType}
                {a.previousStatus && a.newStatus ? ` (${a.previousStatus} → ${a.newStatus})` : ""}
                {a.reason ? `: ${a.reason}` : ""}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
