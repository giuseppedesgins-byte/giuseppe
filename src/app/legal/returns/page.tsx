import { LegalLayout } from "@/components/LegalLayout";
import { getMarketplaceSettings } from "@/lib/settings";

export const metadata = { title: "Returns & Refunds" };
// Reads live settings from the database, so render per request rather than at build time.
export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  const settings = await getMarketplaceSettings();

  return (
    <LegalLayout title="Returns & Refunds">
      <p>
        You can start a return from your order page within {settings.returnWindowDays} days of delivery, unless the
        item is marked <strong>Final Sale</strong> on its product page. Final Sale items aren&rsquo;t eligible for
        change-of-mind returns, but they&rsquo;re always eligible for a return or refund if the item is counterfeit,
        the wrong item, not as described, defective, damaged in transit, missing a piece, or never arrived — Final
        Sale never waives Giuseppe&rsquo;s fulfillment guarantees, only ordinary changes of mind.
      </p>
      <p>
        Who pays for return shipping depends on why you&rsquo;re returning it: if the brand made a mistake (wrong
        item, not as described, defective, damaged, counterfeit, missing item), the brand covers return shipping. If
        you&rsquo;re returning simply because you changed your mind, you&rsquo;re responsible for return shipping
        unless the brand&rsquo;s own policy says otherwise.
      </p>
      <p>
        Start a return or report a problem from your order confirmation page. The seller has {settings.sellerResponseDeadlineDays}{" "}
        days to respond once you open a case; if they don&rsquo;t, it&rsquo;s automatically escalated to Giuseppe. You
        can message the seller directly on the case and see its status change as it moves along.
      </p>
      <p>
        Refunds are issued back to your original payment method once a return is approved (or immediately for
        no-return-required cases like a lost package). If a case isn&rsquo;t resolved directly with the seller,
        contact Giuseppe and we&rsquo;ll step in.
      </p>
      <p>
        [Placeholder: this page reflects current defaults, which Giuseppe can adjust from the admin settings screen.
        Final legal review of this language is still pending.]
      </p>
    </LegalLayout>
  );
}
