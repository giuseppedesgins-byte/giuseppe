import { LegalLayout } from "@/components/LegalLayout";

export const metadata = { title: "Shipping" };

export default function ShippingPage() {
  return (
    <LegalLayout title="Shipping">
      <p>
        Every brand on Giuseppe determines its own shipping destinations, methods,
        processing time, and rates — shown at checkout before you pay. Orders are shipped
        directly by the selling brand, and tracking (where provided) is shared once your
        order ships.
      </p>
      <p>
        If your order includes items from more than one brand, each is shipped and
        tracked separately, since each brand checkout is independent on Giuseppe.
      </p>
    </LegalLayout>
  );
}
