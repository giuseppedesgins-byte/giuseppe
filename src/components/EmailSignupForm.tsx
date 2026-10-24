"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

const CONSENT_LABEL =
  "I agree to receive occasional emails from Giuseppe about new designers, editorial stories, and announcements. I can unsubscribe at any time.";

export function EmailSignupForm({ compact = false, source = "footer" }: { compact?: boolean; source?: string }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !consent) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent: true, source }),
      });
      if (!res.ok) throw new Error("failed");
      trackEvent("email_signup", { email });
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return <p className="text-sm text-giuseppe-ink">You&rsquo;re on the list. Thank you.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="text-left">
      <div className="flex items-stretch border-b border-giuseppe-ink">
        <label htmlFor={`email-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`email-${source}`}
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`w-full bg-transparent py-2 text-sm outline-none placeholder:text-giuseppe-muted ${
            compact ? "" : "text-base"
          }`}
        />
        <button
          type="submit"
          disabled={status === "loading" || !consent}
          className="shrink-0 py-2 text-[11px] uppercase tracking-widest2 text-giuseppe-ink disabled:opacity-40"
        >
          {status === "loading" ? "..." : "Sign up"}
        </button>
      </div>
      <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-giuseppe-muted">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 shrink-0"
        />
        <span>{CONSENT_LABEL}</span>
      </label>
      {status === "error" && (
        <p className="mt-2 text-xs text-red-700">Something went wrong. Please check your email and try again.</p>
      )}
    </form>
  );
}
