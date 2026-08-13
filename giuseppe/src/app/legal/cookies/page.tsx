import { LegalLayout } from "@/components/LegalLayout";

export const metadata = { title: "Cookie Policy" };

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy">
      <p>
        Giuseppe uses essential cookies to operate the site (such as keeping items in
        your cart) and basic analytics to understand how the site is used.
      </p>
      <p>
        [Placeholder: a full cookie inventory, categories (essential/analytics/marketing),
        and a consent mechanism should be added if/when Giuseppe deploys marketing or
        advertising cookies, particularly for EU/UK visitors subject to ePrivacy/GDPR.]
      </p>
    </LegalLayout>
  );
}
