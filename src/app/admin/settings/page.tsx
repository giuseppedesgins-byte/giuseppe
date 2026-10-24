import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getMarketplaceSettings, updateMarketplaceSettings } from "@/lib/settings";

async function saveSettings(formData: FormData) {
  "use server";
  requireAdmin();
  await updateMarketplaceSettings({
    postDeliveryHoldDays: Math.max(0, Math.round(Number(formData.get("postDeliveryHoldDays")))),
    sellerResponseDeadlineDays: Math.max(0, Math.round(Number(formData.get("sellerResponseDeadlineDays")))),
    returnWindowDays: Math.max(0, Math.round(Number(formData.get("returnWindowDays")))),
    abandonedCheckoutMinutes: Math.max(5, Math.round(Number(formData.get("abandonedCheckoutMinutes")))),
  });
  redirect("/admin/settings?saved=1");
}

export default async function AdminSettingsPage({ searchParams }: { searchParams: { saved?: string } }) {
  requireAdmin();
  const settings = await getMarketplaceSettings();

  return (
    <div className="max-w-lg">
      <h1 className="mb-2 font-display text-3xl">Settings</h1>
      <p className="mb-8 text-sm text-giuseppe-muted">
        These numbers apply to new orders and cases going forward — changing one here doesn&rsquo;t move dates already set
        on existing orders.
      </p>

      {searchParams.saved && (
        <p className="mb-6 border border-giuseppe-line bg-white px-4 py-3 text-sm">Settings saved.</p>
      )}

      <form action={saveSettings} className="space-y-6 border border-giuseppe-line bg-white p-6">
        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">
            Post-delivery hold (days)
          </span>
          <p className="mb-2 text-xs text-giuseppe-muted">
            How long after a delivery is confirmed before a seller&rsquo;s funds from that order become available for
            payout, assuming there&rsquo;s no open case or hold on it.
          </p>
          <input
            name="postDeliveryHoldDays"
            type="number"
            min={0}
            defaultValue={settings.postDeliveryHoldDays}
            className="w-32 border border-giuseppe-line px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">
            Seller response deadline (days)
          </span>
          <p className="mb-2 text-xs text-giuseppe-muted">
            How long a seller has to respond to a new case before it&rsquo;s flagged as overdue in the Issues dashboard.
          </p>
          <input
            name="sellerResponseDeadlineDays"
            type="number"
            min={0}
            defaultValue={settings.sellerResponseDeadlineDays}
            className="w-32 border border-giuseppe-line px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">
            Return window (days)
          </span>
          <p className="mb-2 text-xs text-giuseppe-muted">
            How many days after delivery a buyer can start a standard return. Doesn&rsquo;t limit reporting a defective,
            wrong, counterfeit, or never-delivered item — those stay open longer (buyer protection).
          </p>
          <input
            name="returnWindowDays"
            type="number"
            min={0}
            defaultValue={settings.returnWindowDays}
            className="w-32 border border-giuseppe-line px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">
            Abandoned checkout release (minutes)
          </span>
          <p className="mb-2 text-xs text-giuseppe-muted">
            How long a started-but-unpaid checkout holds its reserved inventory before it&rsquo;s automatically released
            back to stock and the order is marked expired.
          </p>
          <input
            name="abandonedCheckoutMinutes"
            type="number"
            min={5}
            defaultValue={settings.abandonedCheckoutMinutes}
            className="w-32 border border-giuseppe-line px-3 py-2 text-sm"
          />
        </label>

        <button className="bg-giuseppe-ink px-6 py-3 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">
          Save settings
        </button>
      </form>
    </div>
  );
}
