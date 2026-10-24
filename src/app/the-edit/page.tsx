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
  description:
    "An exploration of the designers, ideas, and creative movements shaping fashion beyond the familiar. Giuseppe's perspective on what's worth discovering.",
};

// The three recurring series. Each hides itself until it has a published story.
const SERIES = [
  { category: "THE_RADAR", title: "On Our Radar: The Designers You Should Know", note: "Independent designers, collections, and projects worth discovering, whether or not they sell on Giuseppe." },
  { category: "DESIGNER_STORIES", title: "Behind the Design", note: "The creative minds behind fashion: origins, process, and the work itself." },
  { category: "CULTURE", title: "The Culture Report", note: "Fashion where it meets art, music, photography, street style, and identity." },
] as const;

export default async function TheEditPage({ searchParams }: { searchParams: { category?: string } }) {
  const category = categoryFromSlug(searchParams.category);
  const { lead, rest } = await getEditHome(category);

  // Series sections take up to 3 stories each; "Latest" shows whatever is left, so nothing repeats.
  const used = new Set<string>();
  const seriesBlocks = category
    ? []
    : SERIES.map((s) => {
        const items = rest.filter((a) => a.category === s.category).slice(0, 3);
        items.forEach((a) => used.add(a.id));
        return { ...s, items };
      });
  const latest = category ? rest : rest.filter((a) => !used.has(a.id)).slice(0, 6);

  return (
    <div>
      {/* Hero: oversized masthead preserved */}
      <section className="editorial-container pb-10 pt-16 sm:pt-24">
        <p className="eyebrow reveal mb-6">Giuseppe Editorial</p>
        <h1 className="reveal reveal-2 font-display text-[16vw] uppercase leading-[0.86] tracking-tight sm:text-[11vw]">
          The Edit
        </h1>
        <p className="reveal reveal-3 mt-6 font-display text-2xl italic sm:text-3xl">A closer look at what&rsquo;s next.</p>
        <p className="reveal reveal-3 mt-6 max-w-xl leading-relaxed text-giuseppe-muted">
          An exploration of the designers, ideas, and creative movements shaping fashion beyond the familiar. From
          emerging talent to the culture that inspires them, The Edit is Giuseppe&rsquo;s perspective on what&rsquo;s
          worth discovering.
        </p>
        <p className="reveal reveal-3 mt-4 text-[11px] uppercase tracking-widest2 text-giuseppe-ink">
          Independent minds. Original perspectives. Beyond the Known.
        </p>
        <p className="reveal reveal-3 mt-4 text-xs text-giuseppe-muted">
          <a href="#policy" className="underline underline-offset-4">Our editorial policy</a>
        </p>
      </section>

      {/* Category navigation (unchanged) */}
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

      {/* 1. Issue / Cover story */}
      {lead ? (
        <section className="editorial-container py-14 sm:py-20">
          {category && <p className="mb-8 max-w-xl text-sm text-giuseppe-muted">{CATEGORY_META[category].blurb}</p>}
          <p className="eyebrow mb-4">
            {lead.issue ? `Issue ${String(lead.issue).padStart(3, "0")} · ` : ""}
            {category ? CATEGORY_META[category].label : "Cover story"}
          </p>
          <ArticleCard article={lead} large />
        </section>
      ) : (
        !category && (
          <section className="editorial-container py-16 sm:py-24">
            <p className="eyebrow mb-4">Giuseppe Editorial &middot; Issue 001</p>
            <h2 className="font-display text-5xl uppercase leading-[0.9] sm:text-7xl">Beyond the known</h2>
            <p className="mt-4 max-w-md font-display text-xl italic">
              An introduction to a different way of discovering fashion.
            </p>
            <p className="mt-6 max-w-md text-sm text-giuseppe-muted">Issue 001 is in preparation.</p>
          </section>
        )
      )}
      {!lead && category && (
        <section className="editorial-container py-20 text-center">
          <p className="font-display text-3xl">Nothing in {CATEGORY_META[category].label} yet.</p>
        </section>
      )}

      {/* 2. Latest from The Edit */}
      {latest.length > 0 && (
        <section className="editorial-container pb-16 sm:pb-24">
          {!category && <p className="eyebrow mb-8 border-t border-giuseppe-ink pt-4">Latest from The Edit</p>}
          <div className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}

      {/* 3-5. Recurring series: only shown when they have published stories */}
      {seriesBlocks
        .filter((b) => b.items.length > 0)
        .map((b) => (
          <section key={b.category} className="border-t border-giuseppe-line py-16 sm:py-24">
            <div className="editorial-container">
              <div className="mb-10 max-w-2xl">
                <h2 className="font-display text-3xl uppercase leading-[0.95] sm:text-5xl">{b.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-giuseppe-muted">{b.note}</p>
              </div>
              <div className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {b.items.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            </div>
          </section>
        ))}

      {/* 6. Discover Giuseppe: quiet link to the marketplace */}
      <section className="border-y border-giuseppe-line bg-giuseppe-panel py-12">
        <div className="editorial-container flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="max-w-md text-sm leading-relaxed text-giuseppe-muted">
            Looking for pieces to wear? Discover designers approved to sell through Giuseppe.
          </p>
          <Link href="/discover" className="eyebrow link-underline text-giuseppe-ink">
            Discover Giuseppe
          </Link>
        </div>
      </section>

      {/* 7. Designer invitation */}
      <section className="editorial-container py-20 sm:py-28">
        <h2 className="max-w-3xl font-display text-4xl uppercase leading-[0.95] sm:text-6xl">
          Are you creating something we should know about?
        </h2>
        <p className="mt-6 max-w-xl leading-relaxed text-giuseppe-muted">
          Giuseppe is always looking beyond the familiar. If you&rsquo;re an independent designer with a distinctive
          perspective, we&rsquo;d love to discover your work.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="border-t border-giuseppe-ink pt-5">
            <p className="font-display text-2xl">Submit your work</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-giuseppe-muted">
              For editorial consideration in The Edit. You don&rsquo;t need to sell with Giuseppe.
            </p>
            <div className="mt-5">
              <LinkButton href="/the-edit/submit">Submit your work</LinkButton>
            </div>
          </div>
          <div className="border-t border-giuseppe-ink pt-5">
            <p className="font-display text-2xl">Apply to our Founding 10</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-giuseppe-muted">
              To be considered for Giuseppe&rsquo;s curated marketplace. Separate from editorial coverage.
            </p>
            <div className="mt-5">
              <LinkButton href="/apply" variant="outline">
                Apply to our Founding 10
              </LinkButton>
            </div>
          </div>
        </div>
        <p className="mt-8 max-w-xl text-xs leading-relaxed text-giuseppe-muted">
          These are two different things. Submitting work doesn&rsquo;t guarantee coverage, and joining the
          marketplace doesn&rsquo;t guarantee it either.
        </p>
      </section>

      {/* Editorial policy */}
      <section id="policy" className="scroll-mt-24 border-t border-giuseppe-line bg-giuseppe-panel py-16 sm:py-20">
        <div className="editorial-container max-w-3xl">
          <p className="eyebrow mb-4">Editorial policy</p>
          <p className="leading-relaxed text-giuseppe-muted">{EDITORIAL_INDEPENDENCE_NOTE}</p>
          <ul className="mt-6 list-disc space-y-2 pl-5 text-sm leading-relaxed text-giuseppe-muted">
            <li>We cover designers who sell through Giuseppe and designers who don&rsquo;t, and each story says which.</li>
            <li>We credit photographers and sources, and we only use images we own or are licensed to use.</li>
            <li>We don&rsquo;t invent quotes, interviews, or claims. If something is opinion, it&rsquo;s presented as opinion.</li>
            <li>Any sponsored content, gifted product, or commercial relationship will be clearly disclosed on the story.</li>
            <li>Spotted an error? Email support@thegiuseppe.com and we&rsquo;ll look into it.</li>
          </ul>
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
