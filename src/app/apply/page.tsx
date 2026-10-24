import type { Metadata } from "next";
import { ApplyForm } from "./apply-form";

export const metadata: Metadata = {
  title: "Apply to Giuseppe",
  description:
    "Giuseppe selects emerging brands based on originality, product authenticity, presentation, and readiness to serve customers.",
};

export default function ApplyPage() {
  return (
    <div className="editorial-container py-14 sm:py-20">
      <div className="max-w-2xl">
        <p className="eyebrow mb-4">For Designers</p>
        <h1 className="font-display text-4xl sm:text-5xl">Apply to Giuseppe</h1>
        <p className="mt-5 text-base leading-relaxed text-giuseppe-muted">
          Giuseppe selects emerging brands based on originality, product authenticity,
          presentation, and readiness to serve customers. Submitting an application does
          not guarantee acceptance.
        </p>
      </div>
      <div className="mt-14 max-w-3xl">
        <ApplyForm />
      </div>
    </div>
  );
}
