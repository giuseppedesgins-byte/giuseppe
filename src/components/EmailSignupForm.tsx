"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

export function EmailSignupForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
    return <p className="text-sm text-giuseppe-ink">You&rsquo;re on the list.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="flex items-stretch border-b border-giuseppe-ink">
      <input
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
        disabled={status === "loading"}
        className="shrink-0 py-2 text-[11px] uppercase tracking-widest2 text-giuseppe-ink disabled:opacity-50"
      >
        {status === "loading" ? "..." : "Sign up"}
      </button>
    </form>
  );
}
