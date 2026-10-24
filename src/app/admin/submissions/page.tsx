import { revalidatePath } from "next/cache";
import { SubmissionStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function setStatus(formData: FormData) {
  "use server";
  requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as SubmissionStatus;
  if (!Object.values(SubmissionStatus).includes(status)) return;
  await prisma.editorialSubmission.update({ where: { id }, data: { status } });
  revalidatePath("/admin/submissions");
}

export default async function AdminSubmissionsPage() {
  requireAdmin();
  const items = await prisma.editorialSubmission.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="max-w-4xl">
      <h1 className="mb-2 font-display text-3xl">Editorial submissions</h1>
      <p className="mb-8 max-w-2xl text-sm text-giuseppe-muted">
        Work sent in through "Submit your work" on The Edit. Separate from marketplace applications.
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-giuseppe-muted">No submissions yet.</p>
      ) : (
        <ul className="space-y-6">
          {items.map((s) => (
            <li key={s.id} className="border border-giuseppe-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl">{s.brandName}</p>
                  <p className="text-sm text-giuseppe-muted">
                    {s.name} &middot; <a className="underline" href={`mailto:${s.email}`}>{s.email}</a> &middot;{" "}
                    {s.createdAt.toLocaleDateString("en-US")}
                  </p>
                </div>
                <form action={setStatus} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={s.id} />
                  <select name="status" defaultValue={s.status} className="border border-giuseppe-line px-2 py-1 text-xs">
                    <option value="NEW">New</option>
                    <option value="REVIEWED">Reviewed</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                  <button className="border border-giuseppe-ink px-3 py-1 text-[11px] uppercase tracking-widest2">Save</button>
                </form>
              </div>
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">{s.description}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {s.website && <a className="underline" href={s.website} target="_blank" rel="noopener noreferrer">Website</a>}
                {s.instagram && (
                  <a className="underline" href={`https://instagram.com/${s.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer">
                    Instagram
                  </a>
                )}
                {s.imageLinks.map((l, i) => (
                  <a key={l} className="underline" href={l} target="_blank" rel="noopener noreferrer">
                    Image {i + 1}
                  </a>
                ))}
              </div>
              <p className="mt-3 text-xs text-giuseppe-muted">Sender confirmed they own or can share this work.</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
