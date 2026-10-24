# Phase 0 setup: click-by-click (about 45 minutes, once)

Do the steps in this order. Stop and ask Claude if any screen looks different from what is described. Never paste real passwords or keys into chat; just tell Claude when a step is done.

## Step 1. Rotate the admin secret (Vercel)
1. vercel.com, your project, **Settings**, **Environment Variables**.
2. Find `ADMIN_SESSION_SECRET`, open its menu, **Edit**, and replace the value with a new long random string (40+ characters; a password manager can generate one). Save.
3. Don't reuse the value from any document. You'll be logged out of `/admin` once; that's expected.

## Step 2. Upload this update to GitHub
1. Unzip `giuseppe-update-3.zip`. Open the `update-3` folder, press Cmd+A, and drag everything inside onto GitHub's **Add file, Upload files** page for your repo.
2. Commit. (This goes live as usual because the safe branches don't exist yet; it contains no visible website change, only safety scripts and documents.)
3. In Vercel, Deployments: wait for **Ready**. If it errors, send Claude the last lines of the log.

## Step 3. Create the `production` branch (GitHub)
1. Open your repo. Click the branch button (it says `main`) near the top left of the file list.
2. Type `production` in the box. Click **Create branch: production from main**.

## Step 4. Make `production` the live branch (Vercel)
1. Project, **Settings**, then **Environments** (or **Git**, depending on your screen), then the **Production** environment.
2. Set the **branch tracking / production branch** to `production`. Save.
3. From now on, uploads to `main` make previews, not live changes.

## Step 5. Create the staging database (Supabase)
1. supabase.com, **New project**. Name it `giuseppe-staging`. Pick a region. Save the database password somewhere safe.
2. When ready, click **Connect**. Copy the **pooler** string (this will be the staging `DATABASE_URL`) and the **direct** string (staging `DIRECT_URL`), replacing `[YOUR-PASSWORD]` with the staging password.

## Step 6. Separate the Vercel variables
1. **Production label:** add `APP_ENV` with value `production`, ticked for **Production** only.
2. **Keep previews away from live values:** for every existing variable, open **Edit** and **untick Preview** (leave Production ticked).
3. **Add Preview-only values:** click **Add New**, untick Production and Development, tick **Preview** only, and add these (you can paste several lines at once):

```
DATABASE_URL=<staging pooler string>
DIRECT_URL=<staging direct string>
APP_ENV=staging
ADMIN_EMAIL=<any email you'll use for the staging admin>
ADMIN_PASSWORD=<a DIFFERENT password from production>
ADMIN_SESSION_SECRET=<a new random string, different from production>
STRIPE_SECRET_KEY=<your sk_test_ key>
STRIPE_PUBLISHABLE_KEY=<your pk_test_ key>
STRIPE_WEBHOOK_SECRET=whsec_placeholder
EMAIL_FROM=Giuseppe <onboarding@resend.dev>
```
Leave these out of Preview on purpose: `RESEND_API_KEY` (no real emails from previews), the Supabase storage keys (previews can't write to live files), and `NEXT_PUBLIC_SITE_URL`. Stripe keys must be **test** keys. A preview build refuses to run with a live key.

## Step 7. Protect preview links (Vercel)
Project, **Settings**, **Deployment Protection**: make sure Vercel Authentication (or equivalent) is on for **Preview** deployments, so only people logged in to your Vercel account can open them.

## Step 8. Test the safety net
1. Ask Claude for a tiny harmless change. Upload it to **main**.
2. In Vercel, the new deployment should be labeled **Preview** and build against staging. Open it. The live site should not have changed.
3. Merge on GitHub (pull request `main` to `production`) and confirm the live site updates.
4. Do the rollback rehearsal in `docs/RELEASE_CHECKLIST.md`.

Tell Claude when each step is done. Never send passwords or keys in chat.
