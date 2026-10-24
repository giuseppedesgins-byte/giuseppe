# Getting Giuseppe Live — Step by Step

No coding required. You'll create four free accounts and connect them together.
I'll walk through each phase with you in chat — this doc is here so you can also
follow along or pick back up later. Total time: ~30-45 minutes.

**The four accounts** (all free to start):
1. **GitHub** — stores your code
2. **Supabase** — your database
3. **Stripe** — payments (test mode, no real charges)
4. **Vercel** — hosts the live website

---

## Phase 1 — GitHub (put the code somewhere Vercel can find it)

1. Go to [github.com](https://github.com) and sign up (or sign in if you have an account).
2. Click the **+** in the top right → **New repository**.
3. Name it `giuseppe` (or anything), leave it **Public** or **Private** (either works), don't check any of the "initialize with" boxes, and click **Create repository**.
4. On the next page, click **uploading an existing file**.
5. Find the file **`giuseppe-project-v13.zip`** I gave you in chat and download it (if you haven't already). Double-click it to unzip — this creates a `giuseppe` folder, usually in your **Downloads** folder.
6. **GitHub's website only accepts 100 files per upload, and this project has 114, so it comes in two parts.** Instead of the big zip, download and unzip these two smaller ones: **`giuseppe-v13-upload-1-of-2.zip`** and **`giuseppe-v13-upload-2-of-2.zip`**. (The big zip is still your full backup.)
7. You should be on a GitHub page titled **"Add files via upload"** with a large box that says **"Drag files here to add them to your repository"**. (Already have a repo and updating it? Open your repo on github.com, click **Add file** near the top right of the file list, then **Upload files**.)
8. **Part 1:** open the unzipped `upload-1-of-2` folder and press **Cmd+Shift+.** (period) to reveal hidden files like `.gitignore`. Press **Cmd+A** to select everything inside, and drag it onto the big box. Wait until every file finishes listing, scroll down, and click the green **Commit changes** button.
9. **Part 2:** go back to **Add file → Upload files**. Open the unzipped `upload-2-of-2` folder, press **Cmd+A**, and drag everything inside it (a single folder called `src`) onto the box. Wait for the files to list, then click **Commit changes**. GitHub merges it into the `src` folder from Part 1.

*(Always drag what is **inside** the `upload-` folder, not the folder itself, or the files land one level too deep and Vercel won't find them. Vercel may show a red failed deployment after Part 1 only, because the app files aren't there yet. Ignore it; only the deployment after Part 2 matters.)*
You now have your code on GitHub.

---

## Phase 2 — Supabase (your database)

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign up. Recommended: choose **Continue with GitHub** so you're not managing another password — it just uses GitHub to log you in.
2. Click **New project**. Pick any name (e.g. `giuseppe`), generate/save a database password somewhere safe, pick the region closest to you, click **Create new project**. (Takes ~2 minutes to provision.)
3. Once it's ready, click the **Connect** button near the top of the project page.
4. You'll see a few connection string options. You need **two**:
   - **Transaction pooler** (or "Session pooler") — this is your `DATABASE_URL`
   - **Direct connection** — this is your `DIRECT_URL`
5. Copy both — each looks like `postgresql://postgres.xxxx:[YOUR-PASSWORD]@...`. Replace `[YOUR-PASSWORD]` with the database password from step 2. Paste both somewhere temporary (a Notes app) — you'll need them in Phase 5.

---

## Phase 3 — Stripe (test-mode payments)

1. Go to [stripe.com](https://stripe.com) → sign up.
2. Once in the dashboard, make sure the toggle in the top right says **Test mode** (it usually defaults to on for a new account).
3. Go to **Developers → API keys**.
4. Copy the **Publishable key** (`pk_test_...`) and **Secret key** (`sk_test_...` — click "Reveal" first). Save both.

We'll come back for a third Stripe value (the webhook secret) after the site is live — it needs your live URL first. That later step also turns on the pieces beyond basic checkout — seller payouts (Stripe Connect), membership billing (subscriptions), and refund/dispute syncing — so don't worry about those now.

---

## Phase 4 — Resend (optional — order/application emails)

You can skip this for now. Without it, the site still works fine — emails just get
logged instead of sent, meaning: when someone applies, checks out, etc., the email
*would* have been sent, but instead the text of it just gets written to Vercel's
system logs (visible in your Vercel dashboard under the project's **Logs** tab) —
nothing actually lands in anyone's inbox. Fine for testing; come back and add Resend
whenever you want real emails going out.

1. Go to [resend.com](https://resend.com) → sign up (choose **Continue with GitHub** — same reasoning as Supabase, one less password) → **API Keys** → create one.

---

## Phase 5 — Vercel (put it live)

1. Go to [vercel.com](https://vercel.com) → sign up **using your GitHub account** (this makes the next step automatic).
2. Click **Add New → Project**.
3. Find your `giuseppe` repo in the list and click **Import**.
4. Before clicking Deploy, open **Environment Variables** and add these (paste each name and value):

| Name | Value |
|---|---|
| `DATABASE_URL` | the Transaction/Session pooler string from Phase 2 |
| `DIRECT_URL` | the Direct connection string from Phase 2 |
| `STRIPE_SECRET_KEY` | your `sk_test_...` from Phase 3 |
| `STRIPE_PUBLISHABLE_KEY` | your `pk_test_...` from Phase 3 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_placeholder` (we'll fix this in Phase 6) |
| `ADMIN_SESSION_SECRET` | a long random string you generate yourself (40+ characters; a password manager can make one). Never reuse one that appears in any document. |
| `ADMIN_EMAIL` | an email you'll use to log into `/admin` — pick anything, e.g. `you@example.com` |
| `ADMIN_PASSWORD` | a password you'll remember, for `/admin` login |
| `NEXT_PUBLIC_SITE_URL` | `https://placeholder.vercel.app` (we'll fix this in Phase 6) |
| `RESEND_API_KEY` | your Resend key from Phase 4, or leave blank |
| `EMAIL_FROM` | `Giuseppe <onboarding@resend.dev>` |
| `STRIPE_AUTOMATIC_TAX_ENABLED` | `false` (leave off for now — turning this on later requires Stripe Tax to be set up on your Stripe account first) |

*(Note on `EMAIL_FROM`: paste it exactly as shown above — `Giuseppe <onboarding@resend.dev>` — no changes needed. That's a shared testing address Resend provides so you can send real emails without owning a domain yet. Later, if you buy a domain for Giuseppe, you'd verify it in Resend's dashboard and swap this value for `Giuseppe <hello@yourdomain.com>` — but that's a future step, not something to figure out now.)*

5. Click **Deploy**. This takes a few minutes — it's installing everything, setting up your database tables, and loading the sample brands automatically.
6. When it finishes, click **Visit** — that's your live site.

---

## Phase 6 — Two things to fix now that you have a real URL

1. **Copy your real URL** (looks like `https://giuseppe-yourname.vercel.app`). Find it right above the **Visit** button on the "deployment complete" screen, or at the top of your project's main dashboard page in blue text, or under **Settings → Domains**.
2. In Vercel: **Settings → Environment Variables** → edit `NEXT_PUBLIC_SITE_URL` → paste your real URL. Save.
3. In Stripe (test mode): **Developers → Webhooks → Add endpoint**. Endpoint URL: `https://your-real-url.vercel.app/api/webhooks/stripe`. Select these events (search/add each one — this covers checkout, seller payouts, membership billing, and refunds/disputes):
   - `checkout.session.completed`
   - `account.updated`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `charge.dispute.created`
   - `refund.updated`

   Before saving, also check the box for **"Listen to events on Connected accounts"** (Stripe shows this as an option on the same Add endpoint screen) — without it, updates from sellers' own Stripe Connect accounts (like finishing their payout setup) won't reach the site. Save, then copy the **Signing secret** (`whsec_...`).
4. Back in Vercel: your project → **Settings → Environment Variables** → find `STRIPE_WEBHOOK_SECRET` → **Edit** → paste that real value → **Save**.
5. Go to Vercel's **Deployments** tab → click the **...** menu on the latest deployment → **Redeploy**, so the new values take effect.

*(Seller payouts, membership billing, and Stripe Tax are all built in and ready — but each one only fully activates once you, personally, flip it on: Connect payouts work once a seller completes their own Stripe onboarding from the seller portal; Tax stays off until `STRIPE_AUTOMATIC_TAX_ENABLED` is set to `true` and Stripe Tax is configured on your account. Nothing here is required to launch — checkout and orders work today regardless.)*

---

## After your first deploy: the safe workflow

Once the site is live, do not keep uploading straight to the live branch. Follow `docs/WORKFLOW.md` (two branches, private previews, a staging database) and the one-time setup in `docs/PHASE0_SETUP_STEPS.md`.

---

## You're live — how to check everything works

- Visit your URL — you should see the homepage with 6 sample brands.
- Go to `/admin/login`, sign in with the `ADMIN_EMAIL`/`ADMIN_PASSWORD` you set.
- Go to `/apply` and submit a test application — check it shows up under **Admin → Applications**.
- Buy something: add a product to cart → checkout → use Stripe's test card `4242 4242 4242 4242`, any future expiry date, any CVC. Order should appear under **Admin → Orders**.

If anything doesn't look right at any step, tell me exactly what you see and I'll tell you what to do next.
