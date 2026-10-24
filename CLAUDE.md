# CLAUDE.md: Giuseppe project guide

Read this first in every session. Longer detail lives in `/docs`. Never put secrets, passwords, API keys, or customer data in this file or in `/docs`.

## Who and what
- **Giuseppe** ("Beyond the Known"): a curated discovery platform for emerging independent fashion designers. Launch campaign: **Our Founding 10**.
- The founder (CEO and creative director) **does not code**. Explain things in plain English, be concise, recommend one option, and ask only when a decision truly matters. Founder decides brand, design, UX, and business strategy.
- Three pillars: **Discover** (marketplace, live-in-progress), **Culture** (The Edit, editorial, beginning), **Elevate** (future ambition: photography, events, collaborations). **Never describe Elevate or any future plan as an existing service.** Never invent designers, quotes, partnerships, press, audience numbers, or sales.

## Stack (details in docs/ARCHITECTURE.md)
Next.js 14 App Router, TypeScript, Tailwind, Prisma 5 + Postgres (Supabase), Stripe (Checkout, Connect Express, subscriptions, Tax), Resend, Supabase Storage, hosted on Vercel, code on GitHub.

## Release rules (docs/WORKFLOW.md)
- Branch `production` = live site. Branch `main` = working copy; every upload creates a private Vercel preview.
- **Never merge into `production`, trigger a production deploy, or change production settings or variables without the founder's explicit approval in that conversation.**
- Previews use a separate staging database and Stripe **test** keys only. `scripts/safe-build.js` blocks a preview build that is not marked `APP_ENV=staging`, or that holds a live Stripe key. Do not weaken it.
- Production builds never use `--accept-data-loss`. Never run destructive database operations without explicit approval, a backup, and a recovery plan.

## Must not change without approval (explain consequences first)
Seller agreement and legal pages (attorney review pending: never present drafts as approved), commission math, subscription billing, payments and Stripe webhooks, refunds and disputes, order fulfilment, seller payout ledger, customer and applicant records, product approval rules, stock-status behavior, admin authentication and permissions, and database schema.

## Business rules to preserve
- Only a product with status `LIVE` from an `ACTIVE` brand is public. Sellers propose; **only Giuseppe approves** listings. Out of Stock hides the product completely (never "Sold Out") and carries no penalty; reactivation needs admin approval.
- Seller-caused cancellation hurts seller standing; legitimate carrier loss does not.
- Marketplace numbers (return window 14 days, hold days, response deadline) are editable in `/admin/settings`; legal pages read them live. Commission default 9% (900 bps); membership founding plan details live in the data, not in public copy.
- Public copy must not state fees or commission until the founder confirms and the attorney reviews.
- The Edit is editorially independent. Marketplace membership never guarantees coverage; coverage never implies partnership. Marketplace status of an article subject is derived from its linked, ACTIVE brand, never typed by hand. Editorial images need ownership or a documented licence plus a credit.
- Legal entity formation (The Giuseppe LLC) and governing law are unconfirmed: keep the bracketed placeholders.

## Conventions
- Keep changes small and reversible. Reuse existing components (`Button`, `ArticleCard`, `FoundingTenGrid`, etc.) and the cream/black editorial style (Playfair display + Inter, `giuseppe-*` Tailwind colors, monochrome).
- Admin pages call `requireAdmin()` at the top; server actions do too. Do not bypass.
- No new paid services or dependencies without the founder's approval and a cost explanation.
- Pages that read the database at request time use `export const dynamic = "force-dynamic"`.
- After code changes: `npm run typecheck` and `npm run lint` where possible. There are no automated tests yet. State clearly what was and wasn't verified. Never claim a feature works unless it was tested.

## Where things are
`src/app` pages and API routes (`admin/`, `seller/`, `the-edit/`, `founding-10/`, `legal/`), `src/lib` business logic (settings, ledger, returns, editorial, stripe, connect), `src/components`, `prisma/schema.prisma`, `prisma/seed.ts` (categories and admin only; sample data is off), `scripts/safe-build.js`.

## Known gaps (as of last audit)
No automated tests, no backups plan (Supabase free), single shared admin password with no lockout, admin cookie falls back to a default signing secret if `ADMIN_SESSION_SECRET` is missing (should be made to fail instead; needs approval), no rate limiting on public forms, no media library or homepage editor yet. See docs/ROADMAP.md.
