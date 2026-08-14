"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { trackEvent } from "@/lib/analytics";

const initialState = {
  founderName: "",
  brandName: "",
  legalBusinessName: "",
  email: "",
  phone: "",
  country: "",
  city: "",
  website: "",
  instagram: "",
  tiktok: "",
  otherSocialLinks: "",
  brandStory: "",
  yearFounded: "",
  productCategories: "",
  targetCustomer: "",
  differentiation: "",
  whyJoinGiuseppe: "",
  productImageUrls: "",
  productVideoUrls: "",
  lookbookUrl: "",
  productDescriptions: "",
  materials: "",
  sizingInfo: "",
  inventoryModel: "",
  avgProcessingTime: "",
  avgShippingTime: "",
  countriesShippedTo: "",
  shippingCarriers: "",
  trackingProvided: "yes",
  maxWeeklyOrderCapacity: "",
  customerSupportEmail: "",
  returnPolicy: "",
  refundPolicy: "",
  manufacturingLocation: "",
  manufacturingType: "in-house",
  manufacturingNotes: "",
};

const CONFIRMATIONS = [
  ["confirmProductsReal", "The products shown in my application are real."],
  ["confirmPhotosAccurate", "The photos and videos submitted accurately represent the products."],
  ["confirmAuthorizedToSell", "My brand owns or is authorized to sell these products."],
  ["confirmNotCounterfeit", "None of the products are counterfeit."],
  ["confirmInfoTruthful", "All information provided in this application is truthful."],
] as const;

const AGREEMENTS = [
  ["agreeApprovalDiscretion", "Giuseppe may approve or reject this application at its sole discretion."],
  ["agreeAdditionalVerification", "Giuseppe may request additional verification at any time."],
  ["agreeRemovalForViolations", "Giuseppe may remove my brand for violating seller standards."],
  ["agreeAccurateRepresentation", "I will maintain accurate product representation at all times."],
  ["agreeFulfillmentResponsibility", "I understand my brand is solely responsible for fulfilling its own orders."],
  ["agreeMarketplaceRules", "I agree to comply with Giuseppe's marketplace rules."],
] as const;

export function ApplyForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [confirmations, setConfirmations] = useState<Record<string, boolean>>({});
  const [agreements, setAgreements] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    trackEvent("application_started");
  }, []);

  function update<K extends keyof typeof form>(key: K, value: string) {
    if (!started) setStarted(true);
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const allConfirmed = CONFIRMATIONS.every(([key]) => confirmations[key]);
    const allAgreed = AGREEMENTS.every(([key]) => agreements[key]);
    if (!allConfirmed || !allAgreed) {
      setError("Please review and check every confirmation and agreement below before submitting.");
      return;
    }
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          productCategories: splitList(form.productCategories),
          productImageUrls: splitList(form.productImageUrls),
          productVideoUrls: splitList(form.productVideoUrls),
          countriesShippedTo: splitList(form.countriesShippedTo),
          shippingCarriers: splitList(form.shippingCarriers),
          trackingProvided: form.trackingProvided === "yes",
          yearFounded: form.yearFounded ? Number(form.yearFounded) : undefined,
          maxWeeklyOrderCapacity: form.maxWeeklyOrderCapacity ? Number(form.maxWeeklyOrderCapacity) : undefined,
          ...confirmations,
          ...agreements,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong submitting your application.");
      }
      trackEvent("application_submitted");
      router.push("/apply/thank-you");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-16">
      {error && (
        <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <Section title="Founder / Business Information">
        <Row>
          <Field label="Founder name" required value={form.founderName} onChange={(v) => update("founderName", v)} />
          <Field label="Brand name" required value={form.brandName} onChange={(v) => update("brandName", v)} />
        </Row>
        <Row>
          <Field label="Legal business name" value={form.legalBusinessName} onChange={(v) => update("legalBusinessName", v)} />
          <Field label="Email" type="email" required value={form.email} onChange={(v) => update("email", v)} />
        </Row>
        <Row>
          <Field label="Phone (optional)" value={form.phone} onChange={(v) => update("phone", v)} />
          <Field label="Website" value={form.website} onChange={(v) => update("website", v)} />
        </Row>
        <Row>
          <Field label="Country" required value={form.country} onChange={(v) => update("country", v)} />
          <Field label="City" required value={form.city} onChange={(v) => update("city", v)} />
        </Row>
        <Row>
          <Field label="Instagram" value={form.instagram} onChange={(v) => update("instagram", v)} />
          <Field label="TikTok" value={form.tiktok} onChange={(v) => update("tiktok", v)} />
        </Row>
        <Field label="Other social links" value={form.otherSocialLinks} onChange={(v) => update("otherSocialLinks", v)} />
      </Section>

      <Section title="Brand Information">
        <TextArea label="Brand story" required value={form.brandStory} onChange={(v) => update("brandStory", v)} />
        <Row>
          <Field label="Year founded" value={form.yearFounded} onChange={(v) => update("yearFounded", v)} />
          <Field
            label="Product categories (comma-separated)"
            value={form.productCategories}
            onChange={(v) => update("productCategories", v)}
          />
        </Row>
        <TextArea label="Target customer" value={form.targetCustomer} onChange={(v) => update("targetCustomer", v)} />
        <TextArea label="What makes the brand different?" value={form.differentiation} onChange={(v) => update("differentiation", v)} />
        <TextArea label="Why does the brand want to join Giuseppe?" value={form.whyJoinGiuseppe} onChange={(v) => update("whyJoinGiuseppe", v)} />
      </Section>

      <Section title="Product Verification">
        <p className="mb-4 text-sm text-giuseppe-muted">
          Paste direct links to high-resolution images, clear product videos, and a lookbook if
          available (Google Drive, Dropbox, or hosted URLs — one per line). A dedicated upload
          tool will replace this before public launch.
        </p>
        <TextArea label="Product image URLs (one per line)" value={form.productImageUrls} onChange={(v) => update("productImageUrls", v)} rows={3} />
        <TextArea label="Product video URLs (one per line)" value={form.productVideoUrls} onChange={(v) => update("productVideoUrls", v)} rows={3} />
        <Field label="Lookbook URL" value={form.lookbookUrl} onChange={(v) => update("lookbookUrl", v)} />
        <TextArea label="Product descriptions" value={form.productDescriptions} onChange={(v) => update("productDescriptions", v)} />
        <Row>
          <TextArea label="Materials" value={form.materials} onChange={(v) => update("materials", v)} />
          <TextArea label="Sizing information" value={form.sizingInfo} onChange={(v) => update("sizingInfo", v)} />
        </Row>
        <div className="space-y-3">
          {CONFIRMATIONS.map(([key, label]) => (
            <Checkbox
              key={key}
              checked={Boolean(confirmations[key])}
              onChange={(v) => setConfirmations((c) => ({ ...c, [key]: v }))}
              label={label}
            />
          ))}
        </div>
      </Section>

      <Section title="Fulfillment Readiness">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Inventory model</p>
          <select
            value={form.inventoryModel}
            onChange={(e) => update("inventoryModel", e.target.value)}
            className="w-full border border-giuseppe-line bg-transparent px-3 py-2 text-sm"
          >
            <option value="">Select...</option>
            <option value="STOCKED">Stocked / inventory currently available</option>
            <option value="MADE_TO_ORDER">Made-to-order</option>
            <option value="BOTH">Both</option>
          </select>
        </div>
        <Row>
          <Field label="Average processing time" value={form.avgProcessingTime} onChange={(v) => update("avgProcessingTime", v)} />
          <Field label="Average shipping time" value={form.avgShippingTime} onChange={(v) => update("avgShippingTime", v)} />
        </Row>
        <Row>
          <Field label="Countries shipped to (comma-separated)" value={form.countriesShippedTo} onChange={(v) => update("countriesShippedTo", v)} />
          <Field label="Shipping carriers (comma-separated)" value={form.shippingCarriers} onChange={(v) => update("shippingCarriers", v)} />
        </Row>
        <Row>
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Tracking provided?</p>
            <select
              value={form.trackingProvided}
              onChange={(e) => update("trackingProvided", e.target.value)}
              className="w-full border border-giuseppe-line bg-transparent px-3 py-2 text-sm"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <Field label="Approx. max weekly order capacity" value={form.maxWeeklyOrderCapacity} onChange={(v) => update("maxWeeklyOrderCapacity", v)} />
        </Row>
        <Field label="Customer-support email" type="email" value={form.customerSupportEmail} onChange={(v) => update("customerSupportEmail", v)} />
        <Row>
          <TextArea label="Return policy" value={form.returnPolicy} onChange={(v) => update("returnPolicy", v)} />
          <TextArea label="Refund policy" value={form.refundPolicy} onChange={(v) => update("refundPolicy", v)} />
        </Row>
      </Section>

      <Section title="Manufacturing">
        <Field label="Where are products manufactured?" value={form.manufacturingLocation} onChange={(v) => update("manufacturingLocation", v)} />
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">Manufacturing type</p>
          <select
            value={form.manufacturingType}
            onChange={(e) => update("manufacturingType", e.target.value)}
            className="w-full border border-giuseppe-line bg-transparent px-3 py-2 text-sm"
          >
            <option value="in-house">In-house</option>
            <option value="third-party">Third-party</option>
            <option value="both">Both</option>
          </select>
        </div>
        <TextArea
          label="Anything else you'd like Giuseppe to know about manufacturing?"
          value={form.manufacturingNotes}
          onChange={(v) => update("manufacturingNotes", v)}
        />
      </Section>

      <Section title="Agreement">
        <p className="mb-4 text-sm text-giuseppe-muted">
          These are template terms pending professional legal review — not final legal
          agreements. By checking the boxes below you acknowledge Giuseppe's current
          marketplace policies as described.
        </p>
        <div className="space-y-3">
          {AGREEMENTS.map(([key, label]) => (
            <Checkbox key={key} checked={Boolean(agreements[key])} onChange={(v) => setAgreements((a) => ({ ...a, [key]: v }))} label={label} />
          ))}
        </div>
      </Section>

      <div>
        <Button type="submit" disabled={status === "submitting"} className="w-full sm:w-auto">
          {status === "submitting" ? "Submitting..." : "Submit Application"}
        </Button>
        <p className="mt-4 max-w-xl text-xs text-giuseppe-muted">
          Submitting an application does not guarantee acceptance. Giuseppe reviews every
          application individually based on originality, product authenticity, presentation,
          and readiness to serve customers.
        </p>
      </div>
    </form>
  );
}

function splitList(value: string) {
  return value
    .split(/[\n,]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-giuseppe-line pt-10">
      <h2 className="mb-6 font-display text-2xl">{title}</h2>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">
        {label} {required && <span className="text-giuseppe-ink">*</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-giuseppe-line bg-transparent px-3 py-2 text-sm outline-none focus:border-giuseppe-ink"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  required,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] uppercase tracking-widest2 text-giuseppe-muted">
        {label} {required && <span className="text-giuseppe-ink">*</span>}
      </span>
      <textarea
        required={required}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-giuseppe-line bg-transparent px-3 py-2 text-sm outline-none focus:border-giuseppe-ink"
      />
    </label>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1" />
      <span>{label}</span>
    </label>
  );
}
