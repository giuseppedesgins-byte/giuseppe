import type { Metadata } from "next";
import { LinkButton } from "@/components/Button";

export const metadata: Metadata = {
  title: "Our World",
  description: "Why Giuseppe exists, what we believe, and where we hope to go.",
};

const TODAY = [
  { t: "Discover", d: "A curated marketplace of emerging independent fashion brands, opening with our first designers." },
  { t: "Culture", d: "The Edit, our independent editorial on emerging designers and fashion culture. It covers designers who sell through Giuseppe and many who don\u2019t. Coverage is never guaranteed by marketplace membership, and we are just beginning." },
];

const FUTURE = [
  "Original editorial features and fashion photography",
  "Creative collaborations with designers",
  "Magazine placements",
  "Cultural events and designer showcases",
];

export default function OurWorldPage() {
  return (
    <div>
      <section className="editorial-container pb-16 pt-16 sm:pb-24 sm:pt-24">
        <p className="eyebrow reveal mb-6">Our World</p>
        <h1 className="reveal reveal-2 max-w-5xl font-display text-[11vw] uppercase leading-[0.9] tracking-tight sm:text-[7.5vw]">
          We believe the next big thing <span className="italic">is still out there.</span>
        </h1>
      </section>

      <section className="border-y border-giuseppe-line bg-giuseppe-panel py-20 sm:py-28">
        <div className="editorial-container grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 text-xl leading-relaxed lg:col-span-7">
            <p>
              Fashion has never belonged only to the names we already know. It belongs to the creators
              experimenting, questioning, and making something entirely their own.
            </p>
            <p className="text-giuseppe-muted">
              Giuseppe exists to discover those voices and create a place where their work can be seen,
              appreciated, and explored.
            </p>
          </div>
        </div>
      </section>

      <section className="editorial-container py-20 sm:py-28">
        <p className="eyebrow mb-4">Where we are today</p>
        <h2 className="mb-10 font-display text-4xl uppercase leading-[0.95] sm:text-5xl">
          Early, and honest about it.
        </h2>
        <p className="max-w-2xl leading-relaxed text-giuseppe-muted">
          Giuseppe is a new, independent platform. We are building it alongside our first designers, and
          we would rather tell you what exists now than overpromise.
        </p>
        <div className="mt-10 grid grid-cols-1 border-t border-giuseppe-ink md:grid-cols-2">
          {TODAY.map((p) => (
            <div key={p.t} className="border-b border-giuseppe-line py-8 md:pr-10">
              <h3 className="font-display text-3xl uppercase">{p.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-giuseppe-muted">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-giuseppe-ink py-20 text-giuseppe-bg sm:py-28">
        <div className="editorial-container grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="eyebrow mb-4 text-giuseppe-bg/60">Elevate &middot; Our future vision</p>
            <h2 className="font-display text-4xl uppercase leading-[0.95] sm:text-5xl">
              Beyond a marketplace.
            </h2>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <p className="leading-relaxed text-giuseppe-bg/75">
              Our ambition is to grow into a broader creative platform that supports independent designers
              through storytelling and culture. In time, we hope that includes:
            </p>
            <ul className="mt-6 border-t border-giuseppe-bg/30">
              {FUTURE.map((f) => (
                <li key={f} className="border-b border-giuseppe-bg/20 py-3 text-sm">
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs leading-relaxed text-giuseppe-bg/60">
              These are goals for the future, not services available today.
            </p>
          </div>
        </div>
      </section>

      <section className="editorial-container py-24 text-center sm:py-32">
        <h2 className="mx-auto max-w-2xl font-display text-4xl uppercase leading-[0.95] sm:text-5xl">
          Make something worth seeing?
        </h2>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <LinkButton href="/founding-10">Our Founding 10</LinkButton>
          <LinkButton href="/apply" variant="outline">
            Apply
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
