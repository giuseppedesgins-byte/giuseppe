import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Submit your work",
  description: "Independent designers: introduce your work to The Edit, Giuseppe's editorial.",
};

const input = "w-full border border-giuseppe-line bg-white px-3 py-2 text-sm";
const label = "mb-1 block text-xs uppercase tracking-widest2 text-giuseppe-muted";

function clean(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s || null;
}

async function submitWork(formData: FormData) {
  "use server";
  // Honeypot: real people never fill this hidden field.
  if (clean(formData.get("company"))) redirect("/the-edit/submit?sent=1");

  const name = clean(formData.get("name"));
  const brandName = clean(formData.get("brandName"));
  const email = clean(formData.get("email"));
  const description = clean(formData.get("description"));
  const rights = formData.get("rights") === "on";
  const website = clean(formData.get("website"));

  if (!name || !brandName || !email || !description) redirect("/the-edit/submit?error=Please+fill+in+all+required+fields.");
  if (!/^\S+@\S+\.\S+$/.test(email)) redirect("/the-edit/submit?error=Please+enter+a+valid+email.");
  if (!rights) redirect("/the-edit/submit?error=Please+confirm+you+own+or+can+share+what+you%27re+submitting.");
  if (website && !/^https?:\/\//i.test(website)) redirect("/the-edit/submit?error=Website+must+start+with+http%3A%2F%2F+or+https%3A%2F%2F.");
  if (description.length > 3000) redirect("/the-edit/submit?error=Please+keep+the+description+under+3000+characters.");

  const imageLinks = ["imageLink1", "imageLink2", "imageLink3"]
    .map((k) => clean(formData.get(k)))
    .filter((v): v is string => Boolean(v));
  if (imageLinks.some((l) => !/^https?:\/\//i.test(l))) redirect("/the-edit/submit?error=Image+links+must+start+with+http%3A%2F%2F+or+https%3A%2F%2F.");

  await prisma.editorialSubmission.create({
    data: {
      name,
      brandName,
      email,
      website,
      instagram: clean(formData.get("instagram")),
      description,
      imageLinks,
      rightsConfirmed: true,
    },
  });
  redirect("/the-edit/submit?sent=1");
}

export default function SubmitPage({ searchParams }: { searchParams: { sent?: string; error?: string } }) {
  if (searchParams.sent) {
    return (
      <div className="editorial-container flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
        <p className="eyebrow mb-4">Received</p>
        <h1 className="max-w-xl font-display text-4xl uppercase sm:text-5xl">Thank you for sharing your work.</h1>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-giuseppe-muted">
          We read every submission. We can&rsquo;t promise coverage or a reply to each one, but if we&rsquo;d like to
          feature you, we&rsquo;ll be in touch by email.
        </p>
      </div>
    );
  }

  return (
    <div className="editorial-container py-14 sm:py-20">
      <div className="max-w-2xl">
        <p className="eyebrow mb-4">The Edit</p>
        <h1 className="font-display text-4xl uppercase sm:text-5xl">Submit your work</h1>
        <p className="mt-5 leading-relaxed text-giuseppe-muted">
          Tell us about your work. This is for editorial consideration in The Edit only. You don&rsquo;t need to sell
          with Giuseppe, and it isn&rsquo;t an application to our marketplace (for that, see{" "}
          <a href="/founding-10" className="underline underline-offset-4">Our Founding 10</a>). Submitting doesn&rsquo;t
          guarantee coverage.
        </p>
      </div>

      {searchParams.error && (
        <p className="mt-8 max-w-2xl border border-red-700 p-3 text-sm text-red-700">{searchParams.error}</p>
      )}

      <form action={submitWork} className="mt-10 max-w-2xl space-y-5">
        {/* Honeypot (hidden from people) */}
        <div className="hidden" aria-hidden="true">
          <label>Company <input name="company" tabIndex={-1} autoComplete="off" /></label>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="name">Your name *</label>
            <input id="name" name="name" required className={input} />
          </div>
          <div>
            <label className={label} htmlFor="brandName">Brand or project name *</label>
            <input id="brandName" name="brandName" required className={input} />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="email">Email *</label>
          <input id="email" name="email" type="email" required className={input} />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="website">Website</label>
            <input id="website" name="website" placeholder="https://" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="instagram">Instagram</label>
            <input id="instagram" name="instagram" placeholder="@handle" className={input} />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="description">What are you making, and what makes it yours? *</label>
          <textarea id="description" name="description" rows={6} required maxLength={3000} className={input} />
        </div>
        <fieldset className="space-y-3">
          <legend className={label}>Links to images (up to 3). Link to your own pages; don&rsquo;t attach files.</legend>
          <input name="imageLink1" placeholder="https://" className={input} aria-label="Image link 1" />
          <input name="imageLink2" placeholder="https://" className={input} aria-label="Image link 2" />
          <input name="imageLink3" placeholder="https://" className={input} aria-label="Image link 3" />
        </fieldset>
        <label className="flex items-start gap-2 text-xs leading-relaxed text-giuseppe-muted">
          <input type="checkbox" name="rights" required className="mt-0.5 shrink-0" />
          <span>
            I confirm the work and images I&rsquo;m sharing are mine, or I have the right to share them, and I understand
            Giuseppe may review them for possible editorial consideration. Nothing is published without further contact
            and agreement.
          </span>
        </label>
        <button className="bg-giuseppe-ink px-7 py-3 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">
          Submit
        </button>
      </form>
    </div>
  );
}
