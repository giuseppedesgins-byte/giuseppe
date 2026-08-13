import Link from "next/link";
import { SITE_NAME } from "@/lib/brand";

const NAV_LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/brands", label: "Brands" },
  { href: "/apply", label: "Apply" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-giuseppe-line bg-giuseppe-bg/90 backdrop-blur">
      <div className="editorial-container flex h-16 items-center justify-between sm:h-20">
        <Link
          href="/"
          className="font-display text-xl tracking-wide text-giuseppe-ink sm:text-2xl"
        >
          {SITE_NAME}
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="eyebrow link-underline text-giuseppe-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <Link href="/cart" className="eyebrow link-underline hidden text-giuseppe-ink sm:inline">
            Cart
          </Link>
          <Link
            href="/apply"
            className="hidden border border-giuseppe-ink px-5 py-2 text-[11px] uppercase tracking-widest2 text-giuseppe-ink transition-colors duration-300 ease-editorial hover:bg-giuseppe-ink hover:text-giuseppe-bg md:inline-block"
          >
            Apply to Giuseppe
          </Link>
          {/* Mobile nav intentionally minimal for V1 — expand to a full drawer post-MVP. */}
          <Link href="/discover" className="eyebrow text-giuseppe-ink md:hidden">
            Menu
          </Link>
        </div>
      </div>
    </header>
  );
}
