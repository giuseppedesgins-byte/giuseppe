import Image from "next/image";
import { LinkButton } from "@/components/Button";
import { EmailSignupForm } from "@/components/EmailSignupForm";
import { FoundingTenGrid } from "@/components/FoundingTenGrid";
import { ArticleCard } from "@/components/ArticleCard";
import { getEditHome } from "@/lib/editorial";
import { getFoundingTen } from "@/lib/queries";

export const dynamic = "force-dynamic";

// Drop a real, licensed fashion photograph URL here (e.g. an uploaded image) to fill the hero.
// Left empty on purpose: we don't use stock imagery that could undermine credibility.
const HERO_IMAGE_URL = "";

const PILLARS = [
  { name: "Discover", status: "Opening with our first designers", body: "A curated marketplace of emerging independent fashion brands." },
  { name: "Culture", status: "Beginning", body: "The Edit: our editorial on emerging designers and the culture around independent fashion." },
  { name: "Elevate", status: "Future ambition", body: "Our long-term hope: to support designers through editorial features, photography, collaborations, and events. Not available today." },
];

export default async function HomePage() {
  const [founding, edit] = await Promise.all([getFoundingTen(), getEditHome()]);
  const latest = [edit.lead, ...edit.rest].filter((a): a is NonNullable<typeof a> => Boolean(a)).slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-giuseppe-line">
        {HERO_IMAGE_URL && (
          <Image src={HERO_IMAGE_URL} alt="" fill priority sizes="100vw" className="object-cover opacity-90" />
        )}
        <div className="editorial-container relative flex min-h-[88vh] flex-col justify-between pb-12 pt-10 sm:pt-14">
          <div className="reveal flex items-start justify-between text-[11px] uppercase tracking-widest2 text-giuseppe-muted">
            <span>Our Founding 10</span>
            <span>Now accepting designers</span>
          </div>

          <div>
            <h1 className="reveal reveal-2 font-display text-[17vw] uppercase leading-[0.86] tracking-tight text-giuseppe-ink sm:text-[12vw] lg:text-[10.5vw]">
              Beyond
              <br />
              <span className="italic">the known.</span>
            </h1>
            <p className="reveal reveal-3 mt-8 max-w-md text-lg leading-relaxed text-giuseppe-ink">
              Discover the designers shaping what comes next.
            </p>
            <div className="reveal reveal-3 mt-10 flex flex-col gap-4 sm:flex-row">
              <LinkButton href="/our-world">Explore Giuseppe</LinkButton>
              <LinkButton href="/founding-10" variant="outline">
                Join our Founding 10
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="editorial-container grid grid-cols-1 gap-10 py-24 sm:py-32 lg:grid-cols-12">
        <h2 className="font-display text-4xl uppercase leading-[0.95] sm:text-6xl lg:col-span-7">
          Good design deserves to be discovered.
        </h2>
        <div className="lg:col-span-4 lg:col-start-9 lg:pt-3">
          <p className="leading-relaxed text-giuseppe-muted">
            Some of fashion&rsquo;s most exciting ideas exist beyond the spotlight. Giuseppe is here to find
            them. We bring independent designers and curious minds together through a curated world of
            fashion, creativity, and culture.
          </p>
          <div className="mt-8">
            <LinkButton href="/our-world" variant="outline">
              Discover our world
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Founding 10 preview */}
      <section className="border-y border-giuseppe-line bg-giuseppe-bg py-20 sm:py-28">
        <div className="editorial-container">
          <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="eyebrow mb-4">Our Founding 10</p>
              <h2 className="font-display text-4xl uppercase leading-[0.95] sm:text-6xl">
                The first ten. The beginning of something bigger.
              </h2>
            </div>
            <div className="lg:col-span-4 lg:col-start-9 lg:pt-8">
              <p className="leading-relaxed text-giuseppe-muted">
                We&rsquo;re searching for ten independent fashion brands to help shape the beginning of
                Giuseppe. Ten distinct perspectives. Ten creative identities. One shared belief that great
                fashion deserves to be seen.
              </p>
              <div className="mt-8">
                <LinkButton href="/founding-10">Apply to be a founding designer</LinkButton>
              </div>
            </div>
          </div>
          <FoundingTenGrid brands={founding} showStatements={false} />
        </div>
      </section>

      {/* Three pillars, clearly separating what's here from what's ahead */}
      <section className="editorial-container py-24 sm:py-32">
        <p className="eyebrow mb-4">What we&rsquo;re building</p>
        <div className="grid grid-cols-1 border-t border-giuseppe-ink md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <div key={p.name} className="border-b border-giuseppe-line py-8 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0">
              <p className="outline-numeral font-display text-6xl leading-none">0{i + 1}</p>
              <h3 className="mt-6 font-display text-3xl uppercase">{p.name}</h3>
              <p className="mt-2 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">{p.status}</p>
              <p className="mt-4 text-sm leading-relaxed text-giuseppe-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Two ways in: culture and commerce */}
      <section className="bg-giuseppe-ink py-24 text-giuseppe-bg sm:py-32">
        <div className="editorial-container">
          <h2 className="max-w-3xl font-display text-4xl uppercase leading-[0.95] sm:text-6xl">
            Learn what&rsquo;s next. Then shop it.
          </h2>
          <div className="mt-14 grid grid-cols-1 gap-12 md:grid-cols-2">
            <div className="border-t border-giuseppe-bg/40 pt-6">
              <p className="eyebrow mb-3 text-giuseppe-bg/60">Discover through culture</p>
              <h3 className="font-display text-3xl">The Edit</h3>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-giuseppe-bg/70">
                Independent editorial on emerging designers, collections, and creative movements, in and beyond
                Giuseppe.
              </p>
              <div className="mt-6">
                <LinkButton
                  href="/the-edit"
                  variant="outline"
                  className="border-giuseppe-bg !text-giuseppe-bg hover:bg-giuseppe-bg hover:!text-giuseppe-ink"
                >
                  Read The Edit
                </LinkButton>
              </div>
            </div>
            <div className="border-t border-giuseppe-bg/40 pt-6">
              <p className="eyebrow mb-3 text-giuseppe-bg/60">Discover through commerce</p>
              <h3 className="font-display text-3xl">The marketplace</h3>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-giuseppe-bg/70">
                Curated designers approved to sell through Giuseppe, and the pieces they make.
              </p>
              <div className="mt-6">
                <LinkButton
                  href="/discover"
                  variant="outline"
                  className="border-giuseppe-bg !text-giuseppe-bg hover:bg-giuseppe-bg hover:!text-giuseppe-ink"
                >
                  Shop Giuseppe
                </LinkButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {latest.length > 0 && (
        <section className="editorial-container py-24 sm:py-32">
          <p className="eyebrow mb-8">Latest from The Edit</p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-3">
            {latest.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}

      {/* Email signup */}
      <section className="editorial-container py-24 text-center sm:py-32">
        <p className="eyebrow mb-4">Stay ahead of what&rsquo;s next</p>
        <h2 className="mx-auto mb-8 max-w-md font-display text-2xl sm:text-3xl">
          Occasional updates on new designers, stories, and announcements.
        </h2>
        <div className="mx-auto max-w-sm">
          <EmailSignupForm source="homepage" />
        </div>
      </section>
    </div>
  );
}
