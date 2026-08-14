import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAdminCredentials, createAdminSessionToken, getAdminSessionCookieName } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!verifyAdminCredentials(email, password)) {
    redirect("/admin/login?error=1");
  }
  cookies().set(getAdminSessionCookieName(), createAdminSessionToken(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect("/admin");
}

export default function AdminLoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="editorial-container flex min-h-[70vh] items-center justify-center py-20">
      <form action={login} className="w-full max-w-sm space-y-6">
        <div>
          <p className="eyebrow mb-2">Giuseppe Admin</p>
          <h1 className="font-display text-3xl">Sign in</h1>
        </div>
        {searchParams.error && (
          <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            Invalid credentials.
          </p>
        )}
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="w-full border border-giuseppe-line bg-transparent px-3 py-2 text-sm outline-none focus:border-giuseppe-ink"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="w-full border border-giuseppe-line bg-transparent px-3 py-2 text-sm outline-none focus:border-giuseppe-ink"
        />
        <button className="w-full bg-giuseppe-ink px-7 py-3 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">
          Sign in
        </button>
      </form>
    </div>
  );
}
