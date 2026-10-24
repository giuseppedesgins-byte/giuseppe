export function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="editorial-container max-w-2xl py-14 sm:py-20">
      <p className="eyebrow mb-3">Legal</p>
      <h1 className="mb-6 font-display text-3xl sm:text-4xl">{title}</h1>
      <div className="mb-10 border border-giuseppe-line bg-white px-5 py-4 text-sm text-giuseppe-muted">
        This page is a placeholder template prepared for the Giuseppe MVP. It has not been
        reviewed by an attorney and should not be treated as final legal terms — have
        counsel review and finalize this document before public launch.
      </div>
      <div className="space-y-6 text-sm leading-relaxed text-giuseppe-ink">{children}</div>
    </div>
  );
}
