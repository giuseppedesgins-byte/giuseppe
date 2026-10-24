import { LegalLayout } from "@/components/LegalLayout";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        These Terms of Service govern use of the Giuseppe website and marketplace by
        customers and visitors. By using Giuseppe, you agree to these terms.
      </p>
      <p>
        Giuseppe is a curated marketplace: brands are reviewed and approved by Giuseppe
        before their products appear on the site, and Giuseppe may remove brands or
        products at its discretion. Giuseppe is not the manufacturer of any product sold
        on the platform; each order is fulfilled directly by the selling brand, who is
        responsible for the accuracy of product listings and for fulfillment.
      </p>
      <p className="text-xs text-giuseppe-muted">
        Giuseppe is intended to be operated by The Giuseppe LLC. [Entity formation is not yet
        confirmed as complete — do not state or imply Giuseppe is a formed legal entity, and do not
        publish this page as final, until formation and state/country of incorporation are
        confirmed.]
      </p>

      <h2 className="pt-4 font-display text-xl">Accounts &amp; eligibility</h2>
      <p>
        You don&rsquo;t need to create an account to shop on Giuseppe — order lookup works by order
        number and the email you checked out with. You must be at least 18 years old to place an
        order, and you&rsquo;re responsible for providing accurate contact, shipping, and payment
        information at checkout. If you provide false information or use Giuseppe to place
        fraudulent orders, we may cancel the order and refuse future service.
      </p>

      <h2 className="pt-4 font-display text-xl">Acceptable use</h2>
      <p>
        You agree not to: use Giuseppe for any unlawful purpose; attempt to access another
        person&rsquo;s order, account, or the seller/admin areas of the site without authorization;
        scrape, reverse-engineer, or interfere with the site&rsquo;s normal operation; upload or
        submit content (including in applications, reviews, or case messages) that is unlawful,
        infringing, or fraudulent; or resell products purchased on Giuseppe in a way that violates
        the selling brand&rsquo;s own terms. We may suspend or terminate access for violating this
        section.
      </p>

      <h2 className="pt-4 font-display text-xl">Intellectual property</h2>
      <p>
        The Giuseppe name, logo, site design, and original site content are owned by Giuseppe (or
        its licensors) and may not be copied, reproduced, or used without permission. Product names,
        photography, descriptions, and brand marks belong to the respective selling brand, who
        represents that they have the right to use and sell under those marks. Nothing here
        transfers ownership of any brand&rsquo;s intellectual property to Giuseppe or to you.
      </p>

      <h2 className="pt-4 font-display text-xl">Disclaimers &amp; limitation of liability</h2>
      <p>
        Giuseppe is provided &ldquo;as is&rdquo; without warranties of any kind, express or implied.
        Giuseppe does not manufacture, inspect, or take physical possession of any product sold on
        the platform, and does not guarantee the accuracy of any brand&rsquo;s listing, the quality
        or authenticity of any product beyond Giuseppe&rsquo;s own review/verification steps, or that
        the site will be uninterrupted or error-free. To the fullest extent permitted by law,
        Giuseppe&rsquo;s total liability to you for any claim arising from your use of the site or
        any order is limited to the amount you paid for the order giving rise to the claim, and
        Giuseppe is not liable for indirect, incidental, consequential, or punitive damages. Nothing
        in this section is intended to limit liability that cannot be limited under applicable law
        (for example, liability for gross negligence, fraud, or a consumer&rsquo;s statutory
        rights).
      </p>

      <h2 className="pt-4 font-display text-xl">Dispute resolution &amp; governing law</h2>
      <p>
        These Terms are governed by the laws of [State/Country of incorporation — e.g. Delaware,
        USA], without regard to conflict-of-law principles. Before filing a claim, you agree to
        first contact Giuseppe at support@thegiuseppe.com so we can try to resolve the issue directly.
        [Placeholder: decide and insert your actual dispute-resolution mechanism here — e.g. binding
        arbitration on an individual basis (with arbitration body/rules named), a class-action
        waiver if you want one, and/or the specific courts that have jurisdiction if you'd rather
        litigate. This is a real choice with real tradeoffs (cost, speed, appeal rights) — worth
        deciding with a lawyer rather than defaulting silently to either option.]
      </p>

      <h2 className="pt-4 font-display text-xl">Changes to these terms</h2>
      <p>
        Giuseppe may update these Terms from time to time. If we make material changes, we&rsquo;ll
        update the &ldquo;last updated&rdquo; date on this page [and/or notify registered users by
        email — decide based on whether/how you introduce accounts]. Continuing to use Giuseppe
        after changes take effect means you accept the updated Terms.
      </p>

      <p className="text-xs text-giuseppe-muted">
        Last updated: [date]. Remaining bracketed items are reserved for attorney/entity
        confirmation (state/country of incorporation, governing law, and the arbitration-vs-court
        dispute mechanism) — do not treat this page as binding until those are resolved and counsel
        has reviewed the whole document.
      </p>
    </LegalLayout>
  );
}
