import { LegalLayout } from "@/components/LegalLayout";

export const metadata = { title: "Cookie Policy" };

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy">
      <p>
        Giuseppe currently uses only essential cookies and local storage — the kind that are
        necessary for the site to function and generally don&rsquo;t require consent under
        ePrivacy/GDPR rules. We do not currently use marketing, advertising, or third-party
        tracking cookies.
      </p>

      <h2 className="pt-4 font-display text-xl">What we use today</h2>
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-giuseppe-line text-giuseppe-muted">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4">Purpose</th>
            <th className="py-2">Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-giuseppe-line">
            <td className="py-2 pr-4">giuseppe_admin_session</td>
            <td className="py-2 pr-4">Essential cookie</td>
            <td className="py-2 pr-4">Keeps Giuseppe&rsquo;s admin logged in. Only set for the Giuseppe admin, never for customers or sellers.</td>
            <td className="py-2">Session / until logout</td>
          </tr>
          <tr>
            <td className="py-2 pr-4">giuseppe_cart_v1</td>
            <td className="py-2 pr-4">Essential (local storage, not a cookie)</td>
            <td className="py-2 pr-4">Remembers what&rsquo;s in your cart between page visits, stored only in your browser.</td>
            <td className="py-2">Until you clear it or check out</td>
          </tr>
        </tbody>
      </table>

      <h2 className="pt-4 font-display text-xl">Analytics</h2>
      <p>
        Giuseppe has a lightweight internal event tracker for things like &ldquo;add to cart&rdquo; —
        today it only logs to our own server logs in development and does nothing in production. If
        we add a real analytics or advertising tool later (Google Analytics, a marketing pixel,
        etc.), we&rsquo;ll update this page with that tool&rsquo;s specific cookies and add a proper
        consent banner (accept/reject, not just a notice) before it loads for EU/UK visitors, per
        ePrivacy/GDPR.
      </p>

      <h2 className="pt-4 font-display text-xl">Managing cookies</h2>
      <p>
        Since Giuseppe only uses essential cookies today, there&rsquo;s no cookie preference center on
        the site yet — you can still block or delete cookies through your browser settings, though
        doing so may prevent your cart or admin login from working correctly.
      </p>

      <p className="text-xs text-giuseppe-muted">
        Last updated: [date]. This page needs to be revisited the moment any analytics, marketing,
        or advertising cookie is added — don&rsquo;t let this table go stale.
      </p>
    </LegalLayout>
  );
}
