import type { Metadata } from "next";
import { LinkButton } from "@/components/Button";

export const metadata: Metadata = { title: "Application received", robots: { index: false } };

const NEXT_STEPS = [
  "A person at Giuseppe reads your application.",
  "We may email you for more information or samples.",
  "We email you our decision. Applying does not guarantee acceptance.",
  "If accepted, we share the full seller terms, and you submit products. Each one is reviewed before it can appear publicly.",
];

export default function ApplyThankYouPage() {
  return (
    <div className="editorial-container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow mb-4">Application Received</p>
      <h1 className="max-w-xl font-display text-4xl uppercase sm:text-5xl">Thank you for applying to Giuseppe.</h1>
      <div className="mt-10 max-w-md text-left">
        <p className="eyebrow mb-3">What happens next</p>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-giuseppe-muted">
          {NEXT_STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>
      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <LinkButton href="/founding-10">About the Founding 10</LinkButton>
        <LinkButton href="/" variant="outline">
          Back to Giuseppe
        </LinkButton>
      </div>
    </div>
  );
}
