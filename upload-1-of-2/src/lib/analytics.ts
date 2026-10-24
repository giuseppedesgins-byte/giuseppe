/**
 * Minimal analytics shim — swap the body of `trackEvent` for a real provider
 * (PostHog, Segment, GA4, etc.) without touching call sites.
 *
 * Event names correspond to spec §20: homepage_view, brand_viewed, product_viewed,
 * application_started, application_submitted, add_to_cart, checkout_started, purchase,
 * email_signup.
 */
export type AnalyticsEvent =
  | "homepage_view"
  | "brand_viewed"
  | "product_viewed"
  | "application_started"
  | "application_submitted"
  | "add_to_cart"
  | "checkout_started"
  | "purchase"
  | "email_signup";

export function trackEvent(event: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  if (typeof window !== "undefined") {
    // Client-side: no-op provider wired up yet — log in dev, replace with real SDK call.
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug("[analytics]", event, properties);
    }
    return;
  }
  // Server-side tracking (e.g. from route handlers) would go here.
}
