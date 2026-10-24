import Link from "next/link";
import { SITE_NAME } from "@/lib/brand";
import { EmailSignupForm } from "@/components/EmailSignupForm";

// Pre-launch: we're recruiting brands, not selling yet, and the legal pages are awaiting
// attorney review. Set to true to show the Support + Legal footer columns again.
// (The pages themselves still exist at /legal/* — they're just not linked.)
const SHOW_LEGAL_LINKS = false;

const ALL_COLUMNS = [
  {
    title: "Explore",
    links: [
      { href: "/discover", label: "Discover" },
      { href: "/brands", label: "Designers" },
      { href: "/the-edit", label: "The Edit" },
      { href: "/our-world", label: "Our World" },
    ],
  },
  {
    title: "Designers",
    links: [
      { href: "/founding-10", label: "Our Founding 10" },
      { href: "/founding-10#faq", label: "FAQ" },
      { href: "/apply", label: "Apply" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/legal/shipping", label: "Shipping" },
      { href: "/legal/returns", label: "Returns & Refunds" },
      { href: "/legal/marketplace-rules", label: "Marketplace Rules" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms of Service" },
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/seller-agreement", label: "Seller Agreement" },
    ],
  },
];

const COLUMNS = SHOW_LEGAL_LINKS ? ALL_COLUMNS : ALL_COLUMNS.slice(0, 2);

export function Footer() {
  return (
    <footer className="border-t border-giuseppe-line bg-giuseppe-bg">
      <div className="editorial-container grid grid-cols-1 gap-12 py-16 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <p className="font-display text-2xl">{SITE_NAME}</p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-giuseppe-muted">
            Stay ahead of what&rsquo;s next.
          </p>
          <div className="mt-6 max-w-sm">
            <EmailSignupForm compact />
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="eyebrow mb-4">{col.title}</p>
            <ul className="space-y-3">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="link-underline text-sm text-giuseppe-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="editorial-container flex flex-col items-start justify-between gap-2 border-t border-giuseppe-line py-6 text-xs text-giuseppe-muted sm:flex-row sm:items-center">
        <p>&copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
        <p>Beyond the Known.</p>
      </div>
    </footer>
  );
}
