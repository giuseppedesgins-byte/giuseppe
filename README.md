# Giuseppe — MVP

A curated global discovery marketplace for emerging fashion brands. Next.js 14 (App
Router) + TypeScript + Tailwind + Prisma/Postgres + Stripe (test mode) + Resend.

This was built from an empty repository, so everything here is new — nothing was
migrated from an existing codebase.

## Getting started

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL at minimum
npm run db:push             # create tables (or `db:migrate` if you want migration files)
npm run db:seed             # fictional sample brands/products + an admin user
npm run dev
```

Admin panel: `/admin/login` — credentials come from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in
`.env` (not from the seeded `Admin` DB row, which is just for attributing review actions).

Seller portal: after approving an application in `/admin`, the brand's detail page shows
a `/seller/<token>` link — that's the brand's only access point for viewing orders and
adding tracking in V1 (see flags below).

**Important — this environment could not reach the npm registry** (sandboxed, no
outbound access to registry.npmjs.org), so `npm install`, `tsc`, `next lint`, and
`next build` could not actually be executed here. I did a manual pass instead: verified
every `@/...` import resolves to a real file, cross-checked every Prisma enum/field name
against every place it's used in application code, and reviewed each file for obvious
type or JSX errors. Please run the following locally before treating this as launch
ready — it's a real gap, not a formality:

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

## What's built (maps to spec §29 launch definition)

- Homepage, `/discover` (filterable), `/brands`, `/brands/[slug]`, `/products/[slug]` — editorial design system, mobile-first.
- `/apply` — full application form (spec §11 fields) → `BrandApplication` row + confirmation email.
- `/admin` — applications review (approve/reject/request info/notes), brand management (edit, status, Founding Brand toggle, launch/promo tracking, shipping options, enforcement log), product management (create/edit/publish/feature/new-arrival), order management (view + update fulfillment/tracking).
- Cart + **per-brand** checkout (§9) → Stripe Checkout Sessions in test mode, webhook marks orders paid, confirmation email sent.
- Refunds: full-order refund button in `/admin/orders/[id]`, actually processes via Stripe (not just a status label), no partial refunds. Giuseppe does not retain commission on refunds (business decision). Kept in sync with refunds issued directly in the Stripe dashboard via a `refund.updated` webhook handler (Stripe's current recommended event, per their Oct 2024 refund-events change — not the older `charge.refunded`).
- Minimal seller portal (`/seller/[token]`) — view orders, add tracking, update fulfillment status. Sellers cannot publish products directly (admin-only, per spec §16).
- Transactional email templates (application received/accepted/rejected/needs-info, order confirmation, shipping confirmation) via Resend, with a console-log fallback when `RESEND_API_KEY` isn't set so the flow is testable without an account.
- SEO: metadata/OpenGraph, per-product/brand metadata, JSON-LD on product pages, `sitemap.ts`, `robots.ts`.
- Legal placeholders: Terms, Privacy, Seller Agreement, Marketplace Rules, Returns, Shipping, Cookies — all explicitly marked as templates needing attorney review.
- Prisma schema covering every entity in spec §19, plus `ApplicationReview`, `EnforcementAction`, `SellerPerformance`, `Membership` for the founding-brand/enforcement/review workflows.
- Seed data: 6 fictional brands (no real/copyrighted names), ~15 products, stock editorial photography.

## Decisions made autonomously (per spec §27 — documented, not blocking)

- **Auth**: a single shared admin login (cookie + HMAC token, env-var credentials) rather than real user accounts — fastest path to a working admin panel. Swap for Supabase Auth with a role claim before multiple admins need individual accounts.
- **Seller portal access**: unguessable per-brand token URL rather than a login system, per spec §16 ("do not build a complicated seller portal"). Flagged in `schema.prisma` and the portal page itself — treat the link as sensitive, share it directly with the brand.
- **Product image/video uploads on `/apply`**: URL text fields (one per line) instead of a file-upload widget, since real uploads need a configured Supabase Storage bucket. Swap in a proper upload component before public launch; the DB fields (`productImageUrls`, etc.) already expect an array of URLs either way.
- **Brand approval flow**: approving an application creates a `Brand` in `DRAFT` status (not `ACTIVE`) — an admin still has to finish the storefront and flip it live, matching "brands don't control their own presentation" (spec §7).
- **Commission on shipping**: the 9% commission is calculated on product subtotal only, not shipping — flagged in `lib/pricing.ts` as a business decision to confirm.
- **Analytics**: a single `trackEvent()` shim (`lib/analytics.ts`) that logs in dev and no-ops in production — swap in PostHog/GA4/Segment without touching call sites.

## Flagged — needs your (business/legal/Stripe) decision before going live

These are called out inline in the code (`lib/stripe.ts`, `lib/pricing.ts`,
`.env.example`, `schema.prisma`) as well as here:

1. **Stripe Connect architecture.** Checkout currently creates a plain Stripe Checkout Session against the Giuseppe platform account — funds are *not* routed to a connected seller account yet. Before real sellers get paid you need to decide: Standard vs. Express vs. Custom connected accounts, destination charges vs. separate charges/transfers, and who is merchant of record. This determines dispute/chargeback liability and how `Payout` records actually get money to sellers.
2. **Disputes/chargebacks.** Refunds are now implemented (full amount, no commission retained — see `/admin/orders/[id]`), but `charge.dispute.created` isn't handled — a customer-initiated chargeback through their bank/card issuer (as opposed to a refund you issue) won't automatically update order status yet.
3. **Tax collection.** No tax engine is wired in (Stripe Tax or otherwise) — `totalCents` doesn't include tax. Needs a decision on whether/how to collect sales tax or VAT.
4. **Membership billing.** `Membership` records track trial/pricing state in the DB, but there's no Stripe Subscription actually charging the $29/mo after the trial yet — pricing config lives in `lib/pricing.ts` so it's a small addition once you're ready to charge.
5. **Legal pages.** Every page under `/legal` is explicitly a placeholder, not attorney-reviewed. Do not treat as binding.
6. **Live Stripe/Resend keys.** `.env.example` only has test-mode placeholders. Don't flip `STRIPE_SECRET_KEY` to a live key until #1–3 above are resolved.

## Project structure

```
prisma/schema.prisma      Full data model
prisma/seed.ts            Fictional sample data
src/app/                  Routes (App Router) — public site, /admin, /seller, /api/*
src/components/           Shared UI (Header, Footer, ProductCard, BrandCard, ...)
src/lib/                  prisma client, stripe, email, pricing, auth, analytics, queries
```

## Design system

Placeholder brand tokens live in `tailwind.config.ts` (`giuseppe.*` colors) and
`src/lib/fonts.ts` (Playfair Display / Inter standing in for final typefaces) —
swap both in one place once real brand assets exist. `src/lib/brand.ts` holds the
site name/tagline/description used across metadata.
