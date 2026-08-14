import { LegalLayout } from "@/components/LegalLayout";

export const metadata = { title: "Returns & Refunds" };

export default function ReturnsPage() {
  return (
    <LegalLayout title="Returns & Refunds">
      <p>
        Each brand on Giuseppe sets its own return and refund policy, shown on every
        product page before purchase. Because each order is fulfilled directly by the
        selling brand, returns are handled directly with that brand unless otherwise
        noted.
      </p>
      <p>
        If you have an issue with an order that isn&rsquo;t resolved directly with the
        brand, contact Giuseppe and we&rsquo;ll help facilitate a resolution.
      </p>
      <p>
        [Placeholder: standardized minimum return window, refund timing, who bears return
        shipping costs, and Giuseppe's role in disputes should be finalized with legal and
        Stripe/payment-processor input before launch.]
      </p>
    </LegalLayout>
  );
}
