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
      <p>
        [Placeholder: account terms, acceptable use, intellectual property, limitation of
        liability, dispute resolution, governing law, and changes to these terms should be
        added here following legal review.]
      </p>
    </LegalLayout>
  );
}
