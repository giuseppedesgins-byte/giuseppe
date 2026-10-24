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
a `/seller/<token>` link — that's the brand's only access point for viewing/fulfilling
orders and proposing/managing products (see "Seller, Product & Accountability System"
below).

**To enable real photo uploads**, create a public Storage bucket named `product-media` in
your Supabase project (Storage → New bucket → "Public bucket" on), and make sure
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set. Without this, the
upload widgets show a clear "not configured yet" message rather than failing silently —
the URL-paste fields still work as a fallback everywhere.

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
- Refunds: full **or partial** refund from `/admin/orders/[id]` or a case in `/admin/issues`, with a required reason code on every refund. Actually moves money via Stripe. Giuseppe's commission is automatically recalculated on whatever's left after the refund (a full refund still means $0 commission retained; a partial refund keeps commission proportional to the retained sale — see `lib/pricing.ts` `recalculateCommissionAfterRefund`). Kept in sync with refunds issued directly in the Stripe dashboard via a `refund.updated` webhook handler.
- Seller portal (`/seller/[token]`) — orders (fulfillment, tracking, and a seller-initiated **cancel & refund** action with required reason codes), plus a full **Products** section: propose a new product (always lands in admin review, never publishes directly), edit/resubmit drafts, mark a live product **out of stock** (instant, hidden, no penalty), request **reactivation** (stays hidden until Giuseppe approves), quick inventory-quantity edits (no review needed), and propose material changes to an already-live listing (price/photos/description/etc. — live listing stays up until approved).
- Admin **product review queue** (`/admin/products/review`) — new proposals, reactivation requests, and pending update requests in one place; approve/request changes/reject/archive, each emailing the seller and writing an audit log entry.
- Admin **Issues/Cases dashboard** (`/admin/issues`) — every return, refund request, non-shipment report, delivery dispute, defective/misrepresented claim, and seller cancellation lands here as one case type, with a "resolve" action (fault determination + optional refund + required resolution notes) that doubles as the explicit "Giuseppe override" function — no case closes silently.
- Customer order lookup + "report a problem" (`/orders/lookup`, linked from the order-confirmation email and site header) — order number + checkout email, no account needed; feeds the same case system above.
- **Inventory protection** — products can optionally track a stock count; checkout atomically verifies and decrements it inside a DB transaction so two customers can never both buy the last unit. Products left untracked (blank/made-to-order) are never blocked.
- **Absolute out-of-stock visibility rule**: `lib/queries.ts` `getPublishedProductsWhere()` is the single choke point every public page/sitemap/feed queries through, and it only ever returns `LIVE` products. `OUT_OF_STOCK` and `PENDING_REACTIVATION` products are completely invisible everywhere public (not "Sold Out" labeled) while fully preserved internally.
- **Audit log** (`AuditLogEntry`) — append-only record of every product status change and order/financial action (who, when, why, before/after status, before/after commission, refund amount). Visible at the bottom of `/admin/products/[id]` and `/admin/orders/[id]`.
- Real drag-and-drop **image uploads** (Supabase Storage) in the admin product editor and the seller propose/edit forms, alongside the original URL-paste fallback.
- Transactional email templates (application received/accepted/rejected/needs-info, order confirmation with an order-lookup link, shipping confirmation, refund full/partial, seller cancellation, product approved/needs-changes/rejected, reactivation approved/denied, case updates) via Resend, with a console-log fallback when `RESEND_API_KEY` isn't set.
- SEO: metadata/OpenGraph, per-product/brand metadata, JSON-LD on product pages, `sitemap.ts`, `robots.ts`.
- Legal placeholders: Terms, Privacy, Seller Agreement, Marketplace Rules, Returns, Shipping, Cookies — all explicitly marked as templates needing attorney review.
- Prisma schema covering every entity in spec §19 plus the full accountability system: `ApplicationReview`, `EnforcementAction`, `SellerPerformance` (now tracking seller-caused vs. customer cancellations separately, never-shipped orders), `Membership`, `ProductUpdateRequest`, `OrderIssue`, `PaymentDispute` (architecture only, see flags), `AuditLogEntry`.
- Seed data: 6 fictional brands (no real/copyrighted names), ~15 products, stock editorial photography.

## Seller, Product & Accountability System (this update)

This update replaces the earlier admin-only product model with the full seller-proposal /
Giuseppe-gatekeeping system, plus refund/cancellation/case accountability. Summary of how
the pieces fit together — see inline code comments for the specifics:

- **Product lifecycle**: `DRAFT → PENDING_REVIEW → (NEEDS_CHANGES ⟲ | REJECTED | LIVE)`,
  and from `LIVE`: `OUT_OF_STOCK → PENDING_REACTIVATION → LIVE` (admin-gated) or
  `ARCHIVED` (permanent, admin-only). A seller can never move a product to `LIVE`
  themselves under any path.
- **Material changes to a live product** (price, photos, description, materials,
  processing time) go through `ProductUpdateRequest` — a staged proposal that doesn't
  touch the live listing until an admin approves it. **Inventory-quantity edits** and
  **out-of-stock/reactivation** are the two exceptions that apply immediately, since
  neither changes what a customer sees about the product itself.
- **Seller-caused order cancellation** (an already-*paid* order the seller can't fulfill)
  is different from marking a product out-of-stock *before* a sale — cancellation refunds
  the customer in full immediately, reverses commission to $0, and is recorded against the
  seller's performance metrics (`SellerPerformance.sellerCausedCancellations`). Marking
  something out-of-stock pre-emptively never touches performance metrics at all.
- **Commission on partial refunds**: recalculated as `commissionBps% × (subtotal −
  cumulative refunded, floored at 0)`. Worked example matching the spec: $100 sale, 9%
  commission ($9), $20 refunded → $80 retained → commission becomes $7.20.
- **Ownership/security**: every seller-portal server action re-verifies the `portalToken`
  actually owns the product/order being acted on (`lib/seller.ts`) — a seller can't act on
  another brand's data just by editing a form field. Every admin action attributes to an
  `Admin` row via `getSystemAdmin()` (still the single shared admin login — see flags).

## Returns, Complaints & Trust and Safety System (this update)

Extends the case system above rather than duplicating it — a return is still an
`OrderIssue`, just with return-specific fields on the same row. Summary:

- **Seller balances are a ledger, not a number.** `SellerLedgerEntry` is append-only —
  every sale, refund, processor-fee charge, payout, and chargeback is its own row
  (`SALE`, `REFUND_REVERSAL`, `ADJUSTMENT`, `PAYOUT`, `CHARGEBACK`). A seller's "pending,"
  "available," "paid out," and "reversed" totals (shown in the seller portal and on
  `/admin/brands/[id]`) are always computed by summing these rows, never stored as an
  editable balance.
- **Funds go pending → available automatically**, but computed at read time rather than
  on a schedule (there's no cron/job runner in this environment). Every time balances are
  read, any `PENDING` entry whose order's post-delivery hold period has passed — and that
  isn't blocked by an open payout hold — flips to `AVAILABLE`. Functionally identical to a
  background job, just triggered by page views instead of a clock.
- **Payout holds** (`PayoutHold`) freeze funds either for one specific order or, if placed
  without an order, for a seller's entire balance — used while a case is under
  investigation. Admins place/release these from a case's detail page
  (`/admin/issues/[id]`).
- **Returns** reuse `OrderIssue` with added fields (`returnShipmentStatus`,
  `returnShippingResponsibility`, tracking info, `finalSaleAtPurchase`) instead of a
  separate `Return` model. Return eligibility (`lib/returns.ts`) checks the marketplace's
  return window and the product's Final Sale status at the time of purchase — except for
  buyer-protection reasons (counterfeit, wrong item, not-as-described, defective, damaged,
  missing item, never arrived), which are always eligible regardless of window or Final
  Sale, since a seller shouldn't be able to use Final Sale to dodge a fulfillment mistake.
- **Final Sale** (`Product.finalSale`) is settable by sellers when proposing/editing a
  product (subject to the same review flow as any other listing change) or by admins
  directly, and shown prominently on the product page before purchase.
- **Case messaging.** `CaseMessage` rows attach to an `OrderIssue`, with an `internal` flag
  distinguishing seller/buyer-visible case communication from Giuseppe-only notes. Only
  wired up in the admin case view for now — see "Not yet built" below.
- **Counterfeit reports** are the one case type marked urgent automatically and get a
  dedicated red-flagged block in `/admin/issues/[id]` with one-click hide/restore per
  product (reuses the existing `ARCHIVED` status, which is already invisible everywhere
  public — no new status needed).
- **Configurable settings, not hardcoded numbers.** Post-delivery hold period, seller
  response deadline, and return window all live in `MarketplaceSettings` (singleton row),
  editable at `/admin/settings` — no code change needed to adjust them. Defaults: 5-day
  post-delivery hold, 3-day seller response deadline, 14-day return window (your policy doc
  set this to 10; you then told me directly to make it 14 instead — that explicit
  in-conversation instruction wins per the doc's own "unless a later explicit CEO decision
  supersedes this file" clause). Changing a
  setting is never retroactive — dates already set on existing orders/cases (like a
  specific order's `payoutEligibleAt`) are locked in at the values in effect when that
  order/case was created.
- **Chargebacks now do more than log.** `charge.dispute.created` places an order-scoped
  payout hold, records a `CHARGEBACK` ledger entry, and opens an urgent, escalated case —
  still no auto-refund or auto-response, since chargeback liability is a Stripe
  Connect/legal decision (see Flag #1).

## Payments & Money Movement (this update)

This pass resolves the biggest open item from the previous README — Stripe Connect — and
closes out the other "not yet built" gaps from the last report (abandoned checkouts, never-
shipped flagging, size selection, tax, membership billing). Summary:

- **Stripe Connect — DECIDED: Express connected accounts + destination charges.** Sellers
  connect a bank account from a "Payouts" section in their seller portal (a few minutes,
  Stripe-hosted, no full Stripe dashboard). Giuseppe stays merchant of record, which keeps
  the existing payout-hold/case system fully in control — a hold or refund still works
  exactly as before. Checkout only routes money to a seller's connected account once
  Stripe reports them fully onboarded (`charges_enabled && payouts_enabled`, synced via the
  `account.updated` webhook); until then, checkout behaves exactly as it did before this
  update (funds stay on the platform, admin records payouts manually). See `lib/connect.ts`.
  **Action needed from you:** in your Stripe Dashboard, under this webhook endpoint's
  settings, make sure it's also listening for events on connected accounts (not just your
  platform account) — Stripe treats these as a separate subscription. Also test one full
  onboarding with a Stripe test-mode connected account before going live.
- **Refunds now correctly reverse Connect transfers.** All three refund code paths (admin
  order refund, admin case resolution, seller cancellation) now pass `reverse_transfer` and
  `refund_application_fee` to Stripe — without this, refunding an order that had already
  been routed to a seller's connected account would refund the customer while leaving the
  seller's payout untouched, silently costing Giuseppe money. These flags are harmless
  no-ops on orders that were never routed via Connect, so nothing changes for those.
- **Stripe Tax — built, off by default.** `STRIPE_AUTOMATIC_TAX_ENABLED` in `.env.example`
  turns on real sales-tax/VAT calculation and collection at checkout (`lib/stripe.ts`
  `isAutomaticTaxEnabled()`). Deliberately defaults to `false`: turning this on is a real
  compliance step (registering to collect tax in your nexus states/countries inside your
  Stripe Dashboard), not just a flag — flipping it on before registering won't error, it'll
  just silently collect $0 tax everywhere. Once enabled, the actual Stripe-calculated tax is
  synced onto `Order.taxCents`/`totalCents` from the webhook and shown on the customer order
  page and admin order detail. Known gap: the shipping-address "Country" field is free text,
  not a constrained country-code dropdown — worth tightening before relying on this for real
  filings. Known gap: running Stripe Tax and Stripe Connect together needs another look —
  right now the tax portion isn't held back from the seller's transfer.
- **Membership billing is live.** The $29/mo founding-brand fee is now a real Stripe
  Subscription, not just a tracked number. A seller sets up billing from a new "Membership
  billing" section in their portal (Stripe Checkout, subscription mode) — if they're still
  in their trial, the subscription is created in `trialing` status and the first real charge
  happens at `trialEndsAt` (Stripe requires trials to be at least 48 hours out, or billing
  starts immediately). `Membership.status` stays synced with the real Stripe subscription
  state via `customer.subscription.*` webhooks. Sellers can manage or cancel their billing
  through Stripe's own hosted Billing Portal (`lib/membership.ts`).
- **Abandoned checkouts release automatically.** Stock is still decremented the moment
  someone starts Stripe Checkout (never oversell), but a `PENDING_PAYMENT` order older than
  `MarketplaceSettings.abandonedCheckoutMinutes` (default 5, admin-editable — a deliberately
  tight window since Stripe Checkout itself only takes a couple minutes to complete) is now expired
  and its stock restored automatically — see `lib/order-sweep.ts` `releaseAbandonedCheckouts()`.
  Like the payout-release logic, this runs lazily (triggered by real requests — every
  checkout attempt, and every admin/seller orders page load) rather than on a schedule,
  since there's no cron in this environment.
- **Never-shipped orders are flagged automatically.** The same sweep calls
  `flagNeverShippedOrders()`, which counts any order past `expectedShipDate` that still
  hasn't shipped against `SellerPerformance.neverShippedOrders` (idempotent via
  `Order.neverShippedFlaggedAt`, so it's only ever counted once) and shows a red "Overdue —
  never shipped" tag in `/admin/orders`.
- **Size selection at checkout.** Mirrors the existing color-selector pattern — if a product
  has `sizeOptions`, the buyer has to pick one before adding to cart (no separate per-size
  inventory tracking, matching how sizes were scoped originally). The selected size shows
  through cart, checkout summary, the Stripe line item name, and every order view (customer,
  seller, admin) via a new shared `variantLabel()` helper in `lib/pricing.ts`.

## Decisions made autonomously (per spec §27 — documented, not blocking)

- **Auth**: a single shared admin login (cookie + HMAC token, env-var credentials) rather than real user accounts — fastest path to a working admin panel. Swap for Supabase Auth with a role claim before multiple admins need individual accounts.
- **Seller portal access**: unguessable per-brand token URL rather than a login system, per spec §16 ("do not build a complicated seller portal"). Flagged in `schema.prisma` and the portal page itself — treat the link as sensitive, share it directly with the brand.
- **Product image/video uploads on `/apply`**: URL text fields (one per line) instead of a file-upload widget, since real uploads need a configured Supabase Storage bucket. Swap in a proper upload component before public launch; the DB fields (`productImageUrls`, etc.) already expect an array of URLs either way.
- **Brand approval flow**: approving an application creates a `Brand` in `DRAFT` status (not `ACTIVE`) — an admin still has to finish the storefront and flip it live, matching "brands don't control their own presentation" (spec §7).
- **Commission on shipping**: the 9% commission is calculated on product subtotal only, not shipping — flagged in `lib/pricing.ts` as a business decision to confirm.
- **Analytics**: a single `trackEvent()` shim (`lib/analytics.ts`) that logs in dev and no-ops in production — swap in PostHog/GA4/Segment without touching call sites.
- **One audit log model, not several**: product status changes and order/financial actions share a single `AuditLogEntry` table (`entityType` + `entityId`) instead of two near-identical ones, per the "avoid duplicate models" guidance.
- **One case model, not several**: returns, refund requests, non-shipment, delivery disputes, defective claims, and seller cancellations are all `OrderIssue` rows distinguished by `type`, rather than a separate table per case type.
- **Refund/cancellation reason codes** combine the spec's refund-reason list and cancellation-reason list into one `IssueReasonCode` enum, since both describe "why" a case was opened.
- **Order lookup for guests**: since there's no customer login yet, `/orders/[orderNumber]` gates on order number + the email used at checkout (same lightweight pattern as the seller portal's token link) rather than building full customer accounts.

## Not yet built, or deliberately simplified for this pass

Flagged honestly rather than silently skipped:

- **Abandoned-checkout inventory release.** Stock is decremented the moment a customer starts Stripe Checkout (to guarantee no overselling), not when payment succeeds. If they abandon the checkout page, that unit stays "reserved" until an admin notices a stuck `PENDING_PAYMENT` order — there's no automatic release/expiry job yet.
- **Case evidence uploads.** Customers and sellers can attach evidence to a case (`/orders/[orderNumber]`, seller portal) only as pasted photo links for now, not through the same drag-and-drop uploader used for product photos — same underlying storage, just not wired into that form yet.
- **Seller-side case response UI.** Sellers can see cases tied to their orders indirectly (the order and its status), but there's no dedicated "respond to this case" screen in the seller portal yet — admins currently handle the seller side of a case manually, including posting/reading `CaseMessage`s, until that's built.
- **`CaseMessage` isn't shown to buyers or sellers yet.** The thread and the `internal`-note flag exist and are fully wired up in `/admin/issues/[id]`, but only admins can read or post to it right now — the "buyer↔seller messaging separate from internal notes" UI on the customer order page and seller portal is a follow-up.
- **Payment disputes/chargebacks.** `PaymentDispute` records are created for visibility when Stripe sends `charge.dispute.created`, along with a payout hold, a `CHARGEBACK` ledger entry, and an urgent case — but nothing else happens automatically: no auto-refund, no evidence submission to Stripe. Chargeback liability under Express + destination charges generally sits with Giuseppe as merchant of record — worth confirming with Stripe/a lawyer before volume gets meaningful.
- **Seller penalty/fee system.** Commission and "penalty" are kept as clearly separate concepts on purpose — `SellerPerformance` tracks the metrics a penalty system would need (cancellations, refunds, complaints, late/never-shipped orders), but nothing auto-suspends or auto-charges a seller based on thresholds. All standing changes (warning/probation/suspended/removed/permanently banned) stay a manual `EnforcementAction` with a required reason.
- **No dedicated Buyer Protection / Seller Protection pages.** The spec called for standalone pages; I folded the substance (return window, buyer-protection carve-outs, shipping responsibility, hold/response timing) into the existing `/legal/returns` and `/legal/seller-agreement` pages instead of adding two new routes, to keep this pass focused on backend correctness. Easy to split out later if you want dedicated pages.
- **No scheduled/background jobs anywhere, still.** Pending→available balance release, abandoned-checkout release, and never-shipped flagging are all computed lazily when a relevant page/request happens rather than on a timer, since this environment has no cron/job runner. Functionally fine at solo-founder scale; worth a real scheduled job (or a hosting platform's built-in cron, e.g. Vercel Cron) once traffic makes "someone has to hit the endpoint" an unreliable trigger — a stale `PENDING_PAYMENT` order won't expire until the next checkout attempt or admin page view.
- **Shipping address "Country" field is free text.** Fine for display, but Stripe Tax needs a real ISO-3166 country code to calculate tax reliably — worth swapping to a country dropdown before relying on tax collection for real filings.

## Flagged — needs your (business/legal/Stripe) decision before going live

These are called out inline in the code (`lib/stripe.ts`, `lib/pricing.ts`,
`.env.example`, `schema.prisma`) as well as here:

1. ~~Stripe Connect architecture.~~ **Resolved (Aug 2026):** Express connected accounts + destination charges — see "Payments & Money Movement" above and `lib/connect.ts`. Real money now routes to a seller's own bank account once they've completed Stripe's onboarding. **Still needs from you:** enable connected-account events on your webhook endpoint in the Stripe Dashboard, and run one full test-mode onboarding before going live.
2. **Disputes/chargebacks.** Refunds are fully implemented (full or partial, commission recalculated automatically, and now correctly reverse the seller's Connect transfer — see above). `charge.dispute.created` records a `PaymentDispute` row, places a payout hold, and opens an urgent case, but there's still no automated response/evidence submission — see "Not yet built" above.
3. ~~Tax collection.~~ **Resolved (Aug 2026), off by default:** Stripe Tax is fully wired up (`STRIPE_AUTOMATIC_TAX_ENABLED`) but stays off until you flip it on — see "Payments & Money Movement" above for why that's a real compliance step, not just a setting.
4. ~~Membership billing.~~ **Resolved (Aug 2026):** the $29/mo fee is a real Stripe Subscription now, set up by the seller from their portal — see "Payments & Money Movement" above.
5. **Legal pages.** Every page under `/legal` now has full draft language for every section that used to be a bare "[Placeholder]" — limitation of liability, IP, acceptable use, dispute resolution, data retention, user rights, international transfers, children's privacy, cookie inventory, seller indemnification/termination/taxes. **Confirmed business facts applied (Aug 2026, from your policy-decisions doc):** minimum age 18, support/privacy/business contact email `support@thegiuseppe.com`, order record retention 5 years, rejected-application retention 3 months, and the entity name "The Giuseppe LLC" is referenced but explicitly flagged as **not yet confirmed formed** — don't publish any page claiming Giuseppe is a formed legal entity until that's actually true. What's still in brackets is the fixed list from your own doc's "Items Claude Must NOT Guess" section: entity formation/state, governing law, arbitration-vs-litigation + venue (same decision, referenced in both Terms and the Seller Agreement — resolve once), seller termination notice period, exact tax/marketplace-facilitator obligations, exact GDPR/CCPA scope, and chargeback/merchant-of-record allocation. None of it has been reviewed by a lawyer. A full copy of every page's current text is in `giuseppe-legal-pages-for-review.md` (now v3) — send that straight to an attorney. Do not treat any of it as binding.
6. **Live Stripe/Resend keys.** `.env.example` only has test-mode placeholders. Don't flip `STRIPE_SECRET_KEY` to a live key until you've tested Connect onboarding, refunds, and (if enabled) tax collection end-to-end in test mode.
7. **Admin auth is still a single shared login**, now with more financial authority attached to it (refunds, case resolution/overrides, product approval, manual payouts). Fine for a solo founder; put real per-admin accounts behind it before adding a second admin user.
8. ~~Processor fees on refunds.~~ **Resolved (Aug 2026):** when a refund is the seller's fault, the seller — not Giuseppe — absorbs the processor's transaction fee, deducted from their payout. Refunds outside the seller's control (Giuseppe pricing errors, honored change-of-mind, duplicate orders) don't carry this charge. See `lib/pricing.ts` (`isSellerFaultReasonCode`, `estimateProcessorFeeCents`) and the Seller Agreement. Since live per-charge Stripe fee data isn't wired up, this uses a flat estimate (2.9% + $0.30) rather than the exact fee — swap in real data once a Stripe balance-transaction integration exists. Not shown as a line-item in the seller portal yet (disclosed in policy only, per your call) — easy to add later if you want more visibility for sellers.
9. **Judgment calls made in the Returns/Trust & Safety build (Aug 2026)**, flagged so you can revisit any of them: (a) you said "3-5 days" for the post-delivery hold and seller response deadline — I split it 5 days for the hold (longer, since it's the fraud/dispute review window) and 3 days for seller response (shorter, to keep sellers responsive); both are just numbers in `/admin/settings` now, change them anytime. (b) You asked whether settings should be a real screen vs. editing a number in code — I built the real screen, since you'd told me earlier you don't want to deal with code-level nitty-gritty. (c) I did not build the two dedicated Buyer/Seller Protection pages the original spec described — see "Not yet built" above for where that content actually lives instead.
10. **Judgment calls made in the Payments build (Aug 2026):** (a) Express was my recommendation and your pick over Standard/Custom — the tradeoff was control/dispute-liability (Express, Giuseppe stays merchant of record) vs. onboarding simplicity for you (Standard, but sellers own their own disputes). (b) I applied `reverse_transfer`/`refund_application_fee` to every refund unconditionally rather than only on Connect orders, since Stripe safely ignores them otherwise and it's a real correctness bug if missed even once. (c) Stripe Tax + Connect combined is a known gap (tax not held back from the seller's transfer) — flagged rather than guessed at, since getting it wrong means either Giuseppe or the seller is out real money.
11. **CEO policy decisions applied to the legal pages (Aug 2026).** You sent over `Giuseppe_Legal_Policy_Decisions_for_Claude.docx` with confirmed business facts and an explicit "do not guess" list. I applied every confirmed fact (age 18, `support@thegiuseppe.com` for all three contact roles, 5-year/3-month retention periods, 10-day return window, the product-approval/out-of-stock/reactivation workflow language added to the Seller Agreement and Marketplace Rules to match what's actually built) and left every item on your "must not guess" list bracketed exactly as instructed — entity formation/state, governing law, arbitration-vs-court, termination notice period, exact tax/GDPR/CCPA scope, chargeback/MoR allocation. One judgment call: I referenced "The Giuseppe LLC" by name (since your doc named it as the intended entity) but paired it with an explicit, visible flag that formation isn't confirmed — didn't want to either omit the name entirely or state it as fact.
12. **Return window overridden back to 14 days (Aug 2026).** The policy doc set this to 10; right after applying it, you told me directly to make it 14. Went with the in-conversation instruction — it's more recent and the doc itself says a later explicit CEO decision supersedes it. Still just a number in `/admin/settings`, change anytime.

## Project structure

```
prisma/schema.prisma      Full data model
prisma/seed.ts            Fictional sample data
src/app/                  Routes (App Router) — public site, /admin, /seller, /orders, /api/*
src/components/           Shared UI (Header, Footer, ProductCard, BrandCard, ImageUploader, ...)
src/lib/                  prisma client, stripe, email, pricing, auth, analytics, queries,
                           audit (AuditLogEntry writer), performance (SellerPerformance
                           counters), seller (portal ownership checks), upload (Supabase
                           Storage), admin-helpers (system admin resolver), settings
                           (MarketplaceSettings get/update), ledger (seller balance
                           bookkeeping), returns (return eligibility + shipping
                           responsibility), order-sweep (abandoned-checkout release +
                           never-shipped flagging), connect (Stripe Connect Express
                           onboarding), membership (Stripe Subscription billing)
```

## Design system

Placeholder brand tokens live in `tailwind.config.ts` (`giuseppe.*` colors) and
`src/lib/fonts.ts` (Playfair Display / Inter standing in for final typefaces) —
swap both in one place once real brand assets exist. `src/lib/brand.ts` holds the
site name/tagline/description used across metadata.
