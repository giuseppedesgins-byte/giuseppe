/**
 * Giuseppe safe build.
 *
 * Replaces the old build command ("prisma db push --accept-data-loss && seed && next build").
 * The old command touched whichever database the environment variables pointed at, and could
 * silently delete data. This script refuses to run in unsafe situations instead.
 *
 * Rules:
 *  - PREVIEW builds (VERCEL_ENV=preview) may only touch a database when APP_ENV=staging is set
 *    for Preview in Vercel. Otherwise the build stops BEFORE touching any database.
 *  - PREVIEW builds refuse to run with a live Stripe key (sk_live_...).
 *  - PRODUCTION builds never use --accept-data-loss. If a schema change would delete data, the
 *    build fails loudly and the live site keeps running its previous version.
 *  - STAGING (disposable test data) is allowed to accept data loss so schema experiments don't block.
 *
 * Set SAFE_BUILD_DRY_RUN=1 to print what would happen without running anything.
 */
const { execSync } = require("child_process");

const vercelEnv = process.env.VERCEL_ENV || "local"; // production | preview | development | local
const appEnv = process.env.APP_ENV || "";
const dry = process.env.SAFE_BUILD_DRY_RUN === "1";

function stop(msg) {
  console.error("\n[safe-build] STOPPED: " + msg + "\n");
  process.exit(1);
}

function run(cmd) {
  console.log("[safe-build] > " + cmd);
  if (!dry) execSync(cmd, { stdio: "inherit" });
}

if (vercelEnv === "preview") {
  if (appEnv !== "staging") {
    stop(
      "This is a PREVIEW build but APP_ENV is not 'staging', so it might be pointed at the live database. " +
        "Set APP_ENV=staging (Preview only) and use the staging database URLs. See docs/PHASE0_SETUP_STEPS.md."
    );
  }
  if ((process.env.STRIPE_SECRET_KEY || "").startsWith("sk_live_")) {
    stop("A LIVE Stripe key is present in a PREVIEW build. Previews must only use test keys (sk_test_...).");
  }
}

if (vercelEnv === "production" && appEnv && appEnv !== "production") {
  stop("APP_ENV is '" + appEnv + "' on a PRODUCTION build. Check the Vercel environment variable scopes.");
}

const allowDataLoss = vercelEnv === "preview" && appEnv === "staging";

console.log("[safe-build] environment: " + vercelEnv + (appEnv ? " / " + appEnv : "") + (dry ? " (dry run)" : ""));
run("prisma generate");
run("prisma db push" + (allowDataLoss ? " --accept-data-loss" : ""));
run("prisma db seed");
run("next build");
