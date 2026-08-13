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
      <p>
        [Placeholder: data retention, third-party processors, cookie usage, user rights
        (access/deletion), international data transfers, and children's privacy should be
        detailed here following legal review, including applicable regional requirements
        such as GDPR/CCPA if relevant to Giuseppe's customer base.]
      </p>
    </LegalLayout>
  );
}
