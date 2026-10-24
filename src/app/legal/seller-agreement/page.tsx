import { LegalLayout } from "@/components/LegalLayout";
import { getMarketplaceSettings } from "@/lib/settings";

export const metadata = { title: "Seller Agreement" };

export default async function SellerAgreementPage() {
  const settings = await getMarketplaceSettings();

  return (
    <LegalLayout title="Seller Agreement">
      <p>
        This Seller Agreement governs the relationship between Giuseppe and brands
        approved to sell on the marketplace ("Sellers").
      </p>
      <p className="text-xs text-giuseppe-muted">
        Giuseppe is intended to be operated by The Giuseppe LLC. [Entity formation is not yet
        confirmed as complete — do not state or imply Giuseppe is a formed legal entity, and do not
        treat this as a binding agreement, until formation and state/country of incorporation are
        confirmed.]
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Giuseppe reviews and approves applications at its sole discretion; acceptance is not guaranteed.</li>
        <li>Sellers are solely responsible for fulfilling their own orders, including accurate shipping, packaging, and customer service.</li>
        <li>Sellers must represent products accurately and must not list counterfeit, replica, unauthorized, illegal, or materially misrepresented goods.</li>
        <li>New and updated products are submitted through the seller portal for Giuseppe&rsquo;s review and begin as Pending Review, not publicly visible. Only Giuseppe can approve a product to go live — Sellers cannot publish or approve their own listings; Giuseppe supplies the shelf, Sellers supply the product.</li>
        <li>Sellers may mark a live product Out of Stock at any time without Giuseppe&rsquo;s approval — doing so immediately and completely removes it from all public listings (not shown as &ldquo;Sold Out&rdquo;) and does not count against Seller performance, since it&rsquo;s responsible inventory management, not a failure. Returning an Out of Stock product to live requires the Seller to request reactivation (confirming inventory, price, and details are current) and Giuseppe&rsquo;s approval — it stays hidden from customers until then.</li>
        <li>If a customer&rsquo;s paid order is cancelled because the Seller can&rsquo;t fulfill it (for example, inventory turned out to be unavailable after the sale), that is recorded as a Seller-caused cancellation and affects Seller performance standing — unlike marking an item Out of Stock before it sells, which carries no penalty.</li>
        <li>Giuseppe currently charges a commission of approximately 9% on product sales (see current pricing terms); this rate may change with notice.</li>
        <li>Giuseppe does not retain its commission on refunded orders — commission is only ever charged on the portion of a sale the customer keeps.</li>
        <li>When a refund is issued for a reason within the Seller's control (for example: an item that was never shipped, an out-of-stock item that was already sold, a wrong or defective item, or a listing that was materially inaccurate), the Seller is responsible for the payment processor's transaction fee on that sale, which is not returned to Giuseppe by the processor on a refund. This fee is not charged when a refund is issued for reasons outside the Seller's control (for example: a customer's change of mind that Giuseppe elects to honor, a Giuseppe-side pricing or checkout error, or a duplicate order).</li>
        <li>
          Funds from a sale are held as "pending" for {settings.postDeliveryHoldDays} days after the order is marked
          delivered before becoming available for payout, so Giuseppe can review any return, complaint, or dispute
          opened on the order. Giuseppe may also place a hold on a specific order, or on a Seller's funds generally,
          while an issue is being investigated. Holds are lifted once the matter is resolved.
        </li>
        <li>
          If a return, complaint, or case is opened on an order, Sellers are expected to respond within{" "}
          {settings.sellerResponseDeadlineDays} days; cases that go unanswered are automatically escalated to Giuseppe
          for resolution.
        </li>
        <li>Sellers may mark specific items "Final Sale" to opt out of change-of-mind returns; this never overrides a buyer's right to a return or refund for counterfeit, wrong, not-as-described, defective, damaged, missing, or never-arrived items.</li>
        <li>Giuseppe may request additional verification at any time and may suspend or remove a Seller for violating marketplace standards, including for confirmed counterfeit listings, which are removed immediately upon confirmation.</li>
        <li>Approved Sellers are expected to promote their Giuseppe launch on their own social channels for at least 24 hours.</li>
        <li>Payouts are made via Stripe Connect once you complete Stripe&rsquo;s bank-account verification from your seller portal — Giuseppe does not hold or wire funds directly except for anything settled outside Giuseppe before you connected an account.</li>
      </ul>

      <h2 className="pt-4 font-display text-xl">Taxes</h2>
      <p>
        Sellers are solely responsible for determining, collecting (where applicable), and remitting
        any taxes owed on their own income from sales through Giuseppe, including income tax and any
        sales tax/VAT not collected by Giuseppe at checkout. [If Giuseppe enables Stripe Tax
        marketplace-facilitator collection for some jurisdictions, note here which taxes Giuseppe
        collects/remits on the Seller&rsquo;s behalf vs. which remain the Seller&rsquo;s own
        responsibility — this varies by state/country and should be confirmed with a tax
        professional.] Giuseppe may be required to collect tax identification information (such as a
        W-9 or equivalent) from Sellers above certain payout thresholds and to issue applicable tax
        forms (e.g. Form 1099-K in the U.S.).
      </p>

      <h2 className="pt-4 font-display text-xl">Indemnification</h2>
      <p>
        Sellers agree to indemnify and hold Giuseppe harmless from any claim, loss, or expense
        (including reasonable attorneys&rsquo; fees) arising from: the Seller&rsquo;s products
        (including claims of infringement, counterfeit, or defect); the Seller&rsquo;s breach of this
        Agreement or applicable law; or inaccurate information the Seller provided to Giuseppe or to
        customers. Giuseppe will notify the Seller of any such claim it becomes aware of and may, at
        its discretion, participate in the defense.
      </p>

      <h2 className="pt-4 font-display text-xl">Termination</h2>
      <p>
        Either party may terminate this Agreement at any time with [X days] written notice. Giuseppe
        may suspend or terminate a Seller immediately, without notice, for serious violations
        (counterfeit goods, fraud, repeated failure to ship, or similar — see Marketplace Rules).
        Upon termination: pending orders must still be fulfilled or refunded, any funds already
        earned and not subject to an open hold are paid out on Giuseppe&rsquo;s normal payout
        schedule, and the Seller&rsquo;s listings are removed from the site. Sections that by their
        nature should survive termination (taxes, indemnification, dispute resolution) continue to
        apply after termination.
      </p>

      <h2 className="pt-4 font-display text-xl">Dispute resolution &amp; governing law</h2>
      <p>
        This Agreement is governed by the laws of [State/Country of incorporation], without regard to
        conflict-of-law principles. [Same open decision as the Terms of Service — arbitration vs.
        courts, and which venue — decide once with a lawyer and keep both pages consistent.] Before
        filing a claim, both parties agree to attempt to resolve the dispute directly by contacting
        support@thegiuseppe.com.
      </p>

      <p className="text-xs text-giuseppe-muted">
        Last updated: [date]. Remaining bracketed items are reserved for attorney/entity confirmation
        (state/country of incorporation, governing law, arbitration-vs-court mechanism, and the
        termination notice period) — do not treat this as a binding agreement until those are
        resolved and counsel has reviewed the whole document.
      </p>
    </LegalLayout>
  );
}
