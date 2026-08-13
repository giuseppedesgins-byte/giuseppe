import type { Metadata } from "next";
import { LinkButton } from "@/components/Button";

export const metadata: Metadata = { title: "Application received" };

export default function ApplyThankYouPage() {
  return (
    <div className="editorial-container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow mb-4">Application Received</p>
      <h1 className="max-w-xl font-display text-4xl sm:text-5xl">Thank you for applying to Giuseppe.</h1>
      <p className="mt-6 max-w-md text-giuseppe-muted">
        Our team reviews every application carefully. We&rsquo;ll follow up by email —
        submitting an application does not guarantee acceptance.
      </p>
      <div className="mt-10">
        <LinkButton href="/discover">Continue exploring Giuseppe</LinkButton>
      </div>
    </div>
  );
}
