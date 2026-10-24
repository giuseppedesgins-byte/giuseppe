import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/Button";
import { FoundingTenGrid } from "@/components/FoundingTenGrid";
import { getFoundingTen } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Founding 10",
  description:
    "Giuseppe is searching for its Founding 10: independent fashion designers with a point of view, a story to tell, and creations worth discovering.",
};

const WHY_EARLY = [
  "Become part of Giuseppe’s inaugural designer community.",
  "Establish a brand presence on a curated platform built for people who want to discover independent fashion.",
  "Have the opportunity to be considered for Giuseppe’s editorial storytelling as the platform develops.",
  "Help shape the identity and future direction of Giuseppe through early feedback.",
];

const LOOKING_FOR = [
  { t: "Originality", d: "A point of view that feels like yours, not a trend repeated." },
  { t: "Creative identity", d: "A recognizable voice across your pieces, name, and presentation." },
  { t: "Strong design", d: "Considered construction, materials, and detail." },
  { t: "Quality and presentation", d: "Clear, honest photography and descriptions of what you make." },
  { t: "Authentic storytelling", d: "The real story of who you are and why you make what you make." },
  { t: "Readiness to fulfill orders", d: "You can produce, pack, ship, and look after your own customers." },
];

const STEPS = [
  { t: "You apply", d: "Complete the application form with your brand story, your pieces, and how you operate." },
  { t: "A person reads it", d: "Every application is reviewed by the Giuseppe team. We may ask for more information or samples." },
  { t: "You hear from us", d: "We email you a decision. Applying does not guarantee acceptance." },
  { t: "Onboarding, if accepted", d: "We share the full seller terms. You then submit products, and Giuseppe reviews each one before it can appear publicly." },
];

const FAQ = [
  { q: "Do I need to be well known or have a big following?", a: "No. We care about the work, not follower counts. You don’t need to be famous or already be an industry insider." },
  { q: "Is there a deadline?", a: "There is no application deadline. We are looking for ten brands that feel right, and we’ll take the time to choose carefully." },
  { q: "What does it cost?", a: "Applying is free. Full commercial terms are shared with approved designers before anything is listed." },
  { q: "Does being in the Founding 10 guarantee sales, traffic, or press?", a: "No. Giuseppe is an early-stage platform and we can’t promise sales, visitors, publicity, or editorial coverage. We can promise to review every application carefully and to be transparent about what exists and what doesn’t." },
  { q: "Do I keep ownership of my designs?", a: "Yes. Your designs and your brand remain yours." },
  { q: "Who ships orders and handles customers?", a: "You do. Brands fulfill their own orders and look after their customers." },
  { q: "What happens to my information?", a: "We use what you submit to review your application. See our privacy policy for details (currently under legal review)." },
];

export default async function FoundingTenPage() {
  const founding = await getFoundingTen();
  const filled = founding.length;

  return (
    <div>
      {/* Hero */}
      <section className="editorial-container pb-16 pt-16 sm:pb-24 sm:pt-24">
        <p className="eyebrow reveal mb-6">Our Founding 10</p>
        <h1 className="reveal reveal-2 font-display text-[13vw] uppercase leading-[0.88] tracking-tight sm:text-[9vw]">
          Ten designers.
          <br />
          <span className="italic">Infinite possibilities.</span>
        </h1>
        <p className="reveal reveal-3 mt-8 max-w-xl text-lg leading-relaxed text-giuseppe-muted">
          Giuseppe is searching for its Founding 10: independent designers with a point of view, a story to
          tell, and creations worth discovering.
        </p>
        <p className="reveal reveal-3 mt-4 max-w-xl leading-relaxed text-giuseppe-muted">
          These ten brands will represent Giuseppe&rsquo;s inaugural designer community, the first voices
          people meet when they arrive.
        </p>
        <div className="reveal reveal-3 mt-10">
          <LinkButton href="/apply">Apply to be a founding designer</LinkButton>
        </div>
      </section>

      {/* Grid */}
      <section className="border-y border-giuseppe-line py-16 sm:py-24">
        <div className="editorial-container">
          <div className="mb-10 flex items-end justify-between">
            <h2 className="font-display text-3xl uppercase sm:text-4xl">The ten</h2>
            <p className="text-[11px] uppercase tracking-widest2 text-giuseppe-muted">
              {filled} of 10 announced
            </p>
          </div>
          <FoundingTenGrid brands={founding} />
          <p className="mt-6 max-w-xl text-xs leading-relaxed text-giuseppe-muted">
            A position is shown as filled only after a designer has been formally accepted and approved for
            public display.
          </p>
        </div>
      </section>

      {/* Why early */}
      <section className="editorial-container grid grid-cols-1 gap-10 py-20 sm:py-28 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="eyebrow mb-4">Why join early</p>
          <h2 className="font-display text-4xl uppercase leading-[0.95] sm:text-5xl">Begin at the beginning.</h2>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <ul className="border-t border-giuseppe-ink">
            {WHY_EARLY.map((item) => (
              <li key={item} className="border-b border-giuseppe-line py-4 leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs leading-relaxed text-giuseppe-muted">
            These are opportunities, not guarantees. We can&rsquo;t promise sales, traffic, publicity,
            editorial coverage, or future events.
          </p>
        </div>
      </section>

      {/* Who we're looking for */}
      <section className="border-y border-giuseppe-line bg-giuseppe-panel py-20 sm:py-28">
        <div className="editorial-container">
          <p className="eyebrow mb-4">Who we&rsquo;re looking for</p>
          <h2 className="mb-12 font-display text-4xl uppercase leading-[0.95] sm:text-5xl">
            Designers who value
          </h2>
          <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {LOOKING_FOR.map((v) => (
              <div key={v.t} className="border-t border-giuseppe-ink pt-4">
                <p className="font-display text-2xl">{v.t}</p>
                <p className="mt-2 text-sm leading-relaxed text-giuseppe-muted">{v.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-12 max-w-xl leading-relaxed">
            You do not need to be famous, have an enormous following, or already be an industry insider.
            You need to make something worth seeing.
          </p>
        </div>
      </section>

      {/* Process */}
      <section className="editorial-container py-20 sm:py-28">
        <p className="eyebrow mb-4">What happens after you apply</p>
        <h2 className="mb-12 font-display text-4xl uppercase leading-[0.95] sm:text-5xl">The process</h2>
        <ol className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.t}>
              <p className="outline-numeral font-display text-6xl leading-none">0{i + 1}</p>
              <p className="mt-4 font-display text-xl">{s.t}</p>
              <p className="mt-2 text-sm leading-relaxed text-giuseppe-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Participation details */}
      <section className="border-y border-giuseppe-line bg-giuseppe-panel py-16 sm:py-20">
        <div className="editorial-container max-w-3xl">
          <p className="eyebrow mb-4">Participation details</p>
          <p className="leading-relaxed text-giuseppe-muted">
            Giuseppe reviews and approves every designer and every product before it appears publicly.
            Brands are responsible for fulfilling their own orders. Full commercial terms are shared with
            approved designers before anything is listed. You can read the current draft of the{" "}
            <Link href="/legal/seller-agreement" className="underline underline-offset-4">
              Seller Agreement
            </Link>{" "}
            now; it is still under legal review and may change before it is finalized.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="editorial-container scroll-mt-24 py-20 sm:py-28">
        <p className="eyebrow mb-4">FAQ</p>
        <h2 className="mb-12 font-display text-4xl uppercase leading-[0.95] sm:text-5xl">Questions, answered</h2>
        <div className="max-w-3xl border-t border-giuseppe-ink">
          {FAQ.map((f) => (
            <details key={f.q} className="group border-b border-giuseppe-line py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-xl">
                {f.q}
                <span aria-hidden className="text-2xl leading-none group-open:hidden">+</span>
                <span aria-hidden className="hidden text-2xl leading-none group-open:inline">&minus;</span>
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-giuseppe-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-giuseppe-ink py-24 text-center text-giuseppe-bg sm:py-32">
        <div className="editorial-container">
          <h2 className="mx-auto max-w-3xl font-display text-4xl uppercase leading-[0.95] sm:text-6xl">
            Ready to be discovered?
          </h2>
          <div className="mt-10">
            <LinkButton
              href="/apply"
              variant="outline"
              className="border-giuseppe-bg !text-giuseppe-bg hover:bg-giuseppe-bg hover:!text-giuseppe-ink"
            >
              Apply to be a founding designer
            </LinkButton>
          </div>
        </div>
      </section>
    </div>
  );
}
