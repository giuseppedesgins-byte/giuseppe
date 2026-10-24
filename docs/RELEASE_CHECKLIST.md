# Release checklist (use before every Merge into `production`)

- [ ] Preview opened on phone and desktop; looks right.
- [ ] Every new button and link goes somewhere real.
- [ ] Nothing says a future plan already exists; no fee, commission, or legal claims were added without approval.
- [ ] Admin login works on the preview; new admin screens load.
- [ ] If the database schema changed: it was explained, approved, and (once live data matters) a backup exists.
- [ ] If payments, refunds, billing, or seller terms were touched: tested on staging with Stripe test cards and approved explicitly.
- [ ] Founder said "release".

# Rollback rehearsal (do once before launch)
1. In Vercel, note the current Production deployment.
2. Promote an older Ready deployment to Production.
3. Check the site shows the older version.
4. Promote the newest one back.
