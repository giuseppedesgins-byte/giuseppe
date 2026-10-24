import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const CONSENT_TEXT =
  "I agree to receive occasional emails from Giuseppe about new designers, editorial stories, and announcements. I can unsubscribe at any time.";

const schema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
  consent: z.literal(true),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email and agree to receive emails." }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.emailSubscriber.findUnique({ where: { email } });
  const token = existing?.unsubscribeToken ?? randomBytes(24).toString("hex");

  await prisma.emailSubscriber.upsert({
    where: { email },
    // Re-subscribing after an unsubscribe counts as fresh, explicit consent.
    update: { consentAt: new Date(), consentText: CONSENT_TEXT, unsubscribedAt: null, unsubscribeToken: token },
    create: {
      email,
      source: parsed.data.source ?? "footer",
      consentAt: new Date(),
      consentText: CONSENT_TEXT,
      unsubscribeToken: token,
    },
  });
  return NextResponse.json({ ok: true });
}
