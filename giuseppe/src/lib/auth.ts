import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * FLAG: minimal cookie-based admin auth for MVP only. Replace with Supabase Auth
 * (role claim on the User table) or another real auth provider before launch —
 * this is intentionally bare-bones so admin review isn't blocked on auth infra.
 */
const COOKIE_NAME = "giuseppe_admin_session";

function sign(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "dev-secret-change-me";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function createAdminSessionToken(email: string) {
  const payload = `${email}.${Date.now()}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function verifyAdminCredentials(email: string, password: string) {
  return (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD &&
    Boolean(process.env.ADMIN_EMAIL)
  );
}

export function getAdminSessionCookieName() {
  return COOKIE_NAME;
}

export function isValidAdminSession(token: string | undefined): boolean {
  if (!token) return false;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return false;
  const payload = Buffer.from(payloadB64, "base64url").toString();
  const expected = sign(payload);
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function isAdminAuthed(): boolean {
  const token = cookies().get(COOKIE_NAME)?.value;
  return isValidAdminSession(token);
}

/**
 * Call at the top of any protected /admin/* server component (not from admin/layout.tsx —
 * the login page lives under /admin/login and shares that layout, so gating there would
 * create a redirect loop). Each protected page calls this instead.
 */
export function requireAdmin() {
  if (!isAdminAuthed()) {
    redirect("/admin/login");
  }
}

