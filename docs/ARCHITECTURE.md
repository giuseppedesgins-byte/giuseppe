# Architecture (plain version)

- **Website:** Next.js 14 (App Router). Pages are React components in `src/app`. Pages that need live data render on each request.
- **Database:** Postgres on Supabase, read and written through Prisma. The data model is in `prisma/schema.prisma`.
- **Files:** Supabase Storage (public bucket `product-media`) for product photos, via `/api/uploads/product-image`.
- **Payments:** Stripe Checkout for orders; Stripe Connect Express accounts for seller payouts (destination charges); subscriptions for memberships; Stripe Tax built but off (`STRIPE_AUTOMATIC_TAX_ENABLED`). The webhook at `/api/webhooks/stripe` verifies Stripe's signature.
- **Email:** Resend. With no key set, emails are only logged.
- **Auth:** one shared admin login (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) that sets a signed cookie (`ADMIN_SESSION_SECRET`). Sellers use a private token link. Customers have no accounts.

## Key data relationships
- `BrandApplication` -> approved -> `Brand` (status DRAFT/ACTIVE/SUSPENDED/REMOVED). A Brand has Products, ShippingOptions, an optional SellerAccount (Stripe), Membership, SellerPerformance, ledger entries.
- `Product` status flow: DRAFT -> PENDING_REVIEW -> (NEEDS_CHANGES | APPROVED/LIVE) -> OUT_OF_STOCK / PENDING_REACTIVATION / ARCHIVED. Only LIVE is public.
- `Order` -> `OrderItem`s -> `OrderIssue` (returns, cases) and `PaymentDispute`; money movements in `SellerLedgerEntry` and `PayoutHold`.
- `MarketplaceSettings` (single row) holds editable marketplace numbers.
- Editorial: `Article` (category, status, publishedAt, featured, issue, SEO fields) <-> `EditorialSubject` (optionally linked to a `Brand`). `EditorialSubmission` is separate from marketplace applications.
- `Brand.foundingSlot` (1 to 10) positions a brand in the public Founding 10 grid (only if ACTIVE).
- `EmailSubscriber` stores consent and an unsubscribe token.

## Build
`npm run build` runs `scripts/safe-build.js`: `prisma generate`, `prisma db push`, seed, `next build`, with safeguards (see CLAUDE.md).
