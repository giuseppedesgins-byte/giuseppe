import { LegalLayout } from "@/components/LegalLayout";

export const metadata = { title: "Marketplace Rules" };

export default function MarketplaceRulesPage() {
  return (
    <LegalLayout title="Marketplace Rules">
      <p>Sellers approved to sell on Giuseppe agree to the following standards:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Products must be authentic, accurately described, and match submitted photography.</li>
        <li>No counterfeit, replica, unauthorized, illegal, or materially misrepresented products.</li>
        <li>Only Giuseppe can approve a new or updated listing to go live — submissions start as Pending Review and stay off the site until approved.</li>
        <li>Marking a product Out of Stock before it sells is responsible inventory management, not a violation — it requires no approval and carries no penalty. Bringing it back live does require Giuseppe&rsquo;s approval (reactivation).</li>
        <li>Orders must be processed and shipped within the timelines provided at application.</li>
        <li>Tracking must be provided where available and shared with Giuseppe/customers promptly.</li>
        <li>Customer inquiries must be answered promptly and professionally.</li>
        <li>Repeated violations may result in warnings, probation, suspension, or permanent removal — see Enforcement below.</li>
      </ul>
      <h2 className="pt-4 font-display text-xl">Enforcement</h2>
      <p>
        Giuseppe may take enforcement action ranging from a warning to immediate,
        permanent removal depending on severity. Serious violations — including
        counterfeit merchandise, fraud, or repeated failure to ship — may result in
        immediate removal without warning. A legitimate carrier loss, or an order cancelled
        because a Seller responsibly flagged unavailable inventory before a sale, is not
        treated as Seller fault on its own.
      </p>
    </LegalLayout>
  );
}
