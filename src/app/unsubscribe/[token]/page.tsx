import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };
export const dynamic = "force-dynamic";

async function unsubscribe(formData: FormData) {
  "use server";
  const token = String(formData.get("token") || "");
  if (!token) return;
  await prisma.emailSubscriber.updateMany({
    where: { unsubscribeToken: token },
    data: { unsubscribedAt: new Date() },
  });
}

// Requires an explicit button press, so email-scanner link prefetching can't unsubscribe anyone by accident.
export default async function UnsubscribePage({ params }: { params: { token: string } }) {
  const sub = await prisma.emailSubscriber.findUnique({ where: { unsubscribeToken: params.token } });

  return (
    <div className="editorial-container flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow mb-4">Email preferences</p>
      {!sub ? (
        <h1 className="max-w-md font-display text-3xl">This unsubscribe link isn&rsquo;t valid.</h1>
      ) : sub.unsubscribedAt ? (
        <h1 className="max-w-md font-display text-3xl">You&rsquo;re unsubscribed. We won&rsquo;t email you again.</h1>
      ) : (
        <form action={unsubscribe}>
          <input type="hidden" name="token" value={params.token} />
          <h1 className="max-w-md font-display text-3xl">Unsubscribe from Giuseppe emails?</h1>
          <button className="mt-8 bg-giuseppe-ink px-7 py-3 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">
            Yes, unsubscribe
          </button>
        </form>
      )}
    </div>
  );
}
