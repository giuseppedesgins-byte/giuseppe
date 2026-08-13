import { LegalLayout } from "@/components/LegalLayout";

export const metadata = { title: "Seller Agreement" };

export default function SellerAgreementPage() {
  return (
    <LegalLayout title="Seller Agreement">
      <p>
        This Seller Agreement governs the relationship between Giuseppe and brands
        approved to sell on the marketplace ("Sellers").
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Giuseppe reviews and approves applications at its sole discretion; acceptance is not guaranteed.</li>
        <li>Sellers are solely responsible for fulfilling their own orders, including accurate shipping, packaging, and customer service.</li>
        <li>Sellers must represent products accurately and must not list counterfeit, unauthorized, or illegal goods.</li>
        <li>Giuseppe currently charges a commission of approximately 9% on product sales (see current pricing terms); this rate may change with notice.</li>
        <li>Giuseppe may request additional verification at any time and may suspend or remove a Seller for violating marketplace standards.</li>
        <li>Approved Sellers are expected to promote their Giuseppe launch on their own social channels for at least 24 hours.</li>
      </ul>
      <p>
        [Placeholder: payment/payout terms, tax responsibilities, indemnification,
        termination, and dispute resolution require legal drafting and Stripe Connect
        architecture confirmation before this is a binding agreement.]
      </p>
    </LegalLayout>
  );
}
