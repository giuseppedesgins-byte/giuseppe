import type { Metadata } from "next";
import Link from "next/link";
import { ArticleCard } from "@/components/ArticleCard";
import { EmailSignupForm } from "@/components/EmailSignupForm";
import { LinkButton } from "@/components/Button";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  EDITORIAL_INDEPENDENCE_NOTE,
  categoryFromSlug,
  getEditHome,
} from "@/lib/editorial";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Edit",
  description: "A closer look at what's next. Giuseppe's independent editorial on emerging designers and fashion culture.",
};

export default async function TheEditPage({ searchParams }: { searchParams: { category?: string } }) {
  const category = categoryFromSlug(searchParams.category);
  const { lead, rest } = await getEditHome(category);
  const hasAny = Boolean(lead);

  return (
    <div>
      <section className="editorial-container pb-10 pt-16 sm:pt-24">
        <p className="eyebrow reveal mb-6">Giuseppe Editorial &middot; Discover through culture</p>
        <h1 className="reveal reveal-2 font-display text-[16vw] uppercase leading-[0.86] tracking-tight sm:text-[11vw]">
          The Edit
        </h1>
        <p className="reveal reveal-3 mt-6 font-display text-2xl italic sm:text-3xl">A closer look at what&rsquo;s next.</p>
        <p className="reveal reveal-3 mt-6 max-w-xl text-sm leading-relaxed text-giuseppe-muted">
          Stories on emerging designers, collections, and creative movements, whether or not they sell on
          Giuseppe. {EDITORIAL_INDEPENDENCE_NOTE}
        </p>
      </section>

      {/* Category navigation */}
      <nav aria-label="Categories" className="border-y border-giuseppe-line">
        <ul className="editorial-container flex gap-x-8 gap-y-2 overflow-x-auto py-4 text-[11px] uppercase tracking-widest2">
          <li>
            <Link href="/the-edit" className={!category ? "text-giuseppe-ink underline underline-offset-4" : "text-giuseppe-muted hover:text-giuseppe-ink"}>
              All
            </Link>
          </li>
          {CATEGORY_ORDER.map((c) => (
            <li key={c} className="shrink-0">
              <Link
                href={`/the-edit?category=${CATEGORY_META[c].slug}`}
                className={category === c ? "text-giuseppe-ink underline underline-offset-4" : "text-giuseppe-muted hover:text-giuseppe-ink"}
              >
                {CATEGORY_META[c].label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {hasAny ? (
        <section className="editorial-container py-14 sm:py-20">
          {category && <p className="mb-8 max-w-xl text-sm text-giuseppe-muted">{CATEGORY_META[category].blurb}</p>}
          {lead && (
            <div className="mb-16">
              <ArticleCard article={lead} large />
            </div>
          )}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="editorial-container py-20 text-center sm:py-28">
          <p className="font-display text-3xl">
            {category ? `Nothing in ${CATEGORY_META[category].label} yet.` : "Our first stories are on their way."}
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-giuseppe-muted">
            We&rsquo;re preparing original, properly credited work. Nothing is published until it&rsquo;s ready.
          </p>
        </section>
      )}

      {/* Two doors */}
      <section className="border-y border-giuseppe-line bg-giuseppe-panel py-16 sm:py-20">
        <div className="editorial-container grid grid-cols-1 gap-10 md:grid-cols-2">
          <div>
            <p className="eyebrow mb-3">Discover through culture</p>
            <p className="max-w-sm text-sm leading-relaxed text-giuseppe-muted">
              Read about designers and movements from across independent fashion, in and beyond Giuseppe.
            </p>
          </div>
          <div>
            <p className="eyebrow mb-3">Discover through commerce</p>
            <p className="max-w-sm text-sm leading-relaxed text-giuseppe-muted">
              Shop curated designers who have been approved to sell through Giuseppe.
            </p>
            <div className="mt-5">
              <LinkButton href="/discover" variant="outline">
                Shop Giuseppe
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      <section className="editorial-container py-20 text-center sm:py-28">
        <p className="eyebrow mb-4">Be first to read it</p>
        <h2 className="mx-auto mb-8 max-w-md font-display text-2xl sm:text-3xl">
          Get new stories and announcements by email.
        </h2>
        <div className="mx-auto max-w-sm">
          <EmailSignupForm source="the-edit" />
        </div>
      </section>
    </div>
  );
}
