import { LegalLayout } from "@/components/LegalLayout";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        Giuseppe collects information you provide directly (such as your email address,
        shipping address, and order details) and information collected automatically
        through basic site analytics. Information is used to operate the marketplace,
        process orders, communicate with you, and improve Giuseppe.
      </p>
      <p>
        Order information (including shipping address and items purchased) is shared with
        the selling brand so they can fulfill your order. Payment information is
        processed by Stripe and is not stored directly by Giuseppe.
      </p>
      <p className="text-xs text-giuseppe-muted">
        Giuseppe is intended to be operated by The Giuseppe LLC. [Entity formation is not yet
        confirmed as complete — do not state or imply Giuseppe is a formed legal entity, and do not
        publish this page as final, until formation and state/country of incorporation are
        confirmed.]
      </p>

      <h2 className="pt-4 font-display text-xl">Who we share information with</h2>
      <p>
        Beyond the selling brand (for order fulfillment), Giuseppe uses the following third-party
        processors to operate the site — each only receives what it needs to do its job:
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li><strong>Stripe</strong> — payment processing. Stripe receives your payment details directly; Giuseppe never sees or stores your full card number.</li>
        <li><strong>Resend</strong> — transactional email delivery (order confirmations, shipping updates, case updates). Resend receives your email address and the content of the email being sent.</li>
        <li><strong>Supabase</strong> — database hosting and file storage for product photos/application materials.</li>
      </ul>
      <p>
        We don&rsquo;t sell your personal information to third parties, and we don&rsquo;t share it with
        anyone beyond what&rsquo;s needed to fulfill your order, process payment, or operate the site,
        except where required by law (e.g. responding to a valid legal request) or to protect
        against fraud.
      </p>

      <h2 className="pt-4 font-display text-xl">How long we keep information</h2>
      <p>
        We keep order records (including shipping address and purchase history) for 5 years after
        the order date, consistent with our accounting, tax, warranty/return-window, and
        fraud-prevention needs. Application data for brands that weren&rsquo;t approved is kept for
        3 months in case you reapply, then deleted. You can ask us to delete data sooner where
        we&rsquo;re not legally required to keep it — see &ldquo;Your rights&rdquo; below.
      </p>

      <h2 className="pt-4 font-display text-xl">Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, delete, or receive a
        copy of the personal information Giuseppe holds about you, and to object to or restrict
        certain processing. To make a request, email support@thegiuseppe.com — we&rsquo;ll respond
        within the time required by applicable law (for example, 30 days under many U.S. state
        privacy laws, or 1 month under GDPR). We may need to verify your identity before acting on a
        request, and some information (like completed order records) may need to be retained for
        legal/accounting reasons even after a deletion request.
      </p>
      <p>
        If you are in the European Economic Area, UK, or Switzerland, you may also have rights under
        the GDPR (including the right to lodge a complaint with your local data protection
        authority). If you are a California resident, you may have rights under the CCPA/CPRA
        (including the right to opt out of the "sale" or "sharing" of personal information — Giuseppe
        does not sell personal information as defined by that law). [Placeholder: confirm which of
        these regimes actually apply once you know where your customers are based, and appoint an EU
        representative/update this section accordingly if you have EU/UK customers.]
      </p>

      <h2 className="pt-4 font-display text-xl">International data transfers</h2>
      <p>
        Giuseppe and its processors (Stripe, Resend, Supabase) may store and process data in the
        United States or other countries outside your own. Where required, we rely on those
        providers&rsquo; own data-transfer safeguards (such as Standard Contractual Clauses) for
        transfers out of the EEA/UK. [Placeholder: confirm each processor's specific transfer
        mechanism if you have EU/UK customers, and reference it here or in a DPA.]
      </p>

      <h2 className="pt-4 font-display text-xl">Children&rsquo;s privacy</h2>
      <p>
        Giuseppe is not directed at children, and we don&rsquo;t knowingly collect personal
        information from anyone under 13 (or 16, where required by local law). If you believe a
        child has provided us information, contact us at support@thegiuseppe.com and we&rsquo;ll
        delete it.
      </p>

      <h2 className="pt-4 font-display text-xl">Cookies</h2>
      <p>
        See our <a className="link-underline" href="/legal/cookies">Cookie Policy</a> for what we use
        and why.
      </p>

      <p className="text-xs text-giuseppe-muted">
        Last updated: [date]. Remaining bracketed items (which regional privacy laws actually apply,
        international-transfer mechanisms, any required EU/UK representative) are reserved pending
        confirmation of Giuseppe&rsquo;s customer geography and attorney review — do not assert or
        deny GDPR/CCPA/CPRA applicability until that&rsquo;s confirmed.
      </p>
    </LegalLayout>
  );
}
