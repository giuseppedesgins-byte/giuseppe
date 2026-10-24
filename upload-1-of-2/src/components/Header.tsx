"use client";

import Link from "next/link";
import { useState } from "react";
import { SITE_NAME } from "@/lib/brand";

const NAV_LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/brands", label: "Designers" },
  { href: "/the-edit", label: "The Edit" },
  { href: "/our-world", label: "Our World" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-giuseppe-line bg-giuseppe-bg/90 backdrop-blur">
      <div className="editorial-container flex h-16 items-center justify-between sm:h-20">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="font-display text-xl uppercase tracking-[0.18em] text-giuseppe-ink sm:text-2xl"
        >
          {SITE_NAME}
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-9 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="eyebrow link-underline text-giuseppe-ink">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/apply"
            className="border border-giuseppe-ink bg-giuseppe-ink px-4 py-2 text-[11px] uppercase tracking-widest2 text-giuseppe-bg transition-colors duration-300 ease-editorial hover:bg-transparent hover:text-giuseppe-ink sm:px-5"
          >
            Apply
          </Link>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="eyebrow text-giuseppe-ink md:hidden"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Mobile"
          className="border-t border-giuseppe-line bg-giuseppe-bg md:hidden"
        >
          <ul className="editorial-container py-6">
            {[...NAV_LINKS, { href: "/founding-10", label: "Our Founding 10" }].map((link) => (
              <li key={link.href} className="border-b border-giuseppe-line">
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-4 font-display text-3xl text-giuseppe-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
