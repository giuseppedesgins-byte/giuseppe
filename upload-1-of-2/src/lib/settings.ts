import { prisma } from "@/lib/prisma";

/**
 * Marketplace-wide configurable numbers, editable by Giuseppe at /admin/settings without
 * a code change/redeploy. Single-row table (fixed id) rather than a generic key/value
 * store, so each setting stays typed. See prisma/schema.prisma MarketplaceSettings for
 * the "changing this doesn't retroactively affect orders/cases already in flight" note.
 */
const SETTINGS_ID = "singleton";

export async function getMarketplaceSettings() {
  const existing = await prisma.marketplaceSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) return existing;
  return prisma.marketplaceSettings.create({ data: { id: SETTINGS_ID } });
}

export async function updateMarketplaceSettings(data: {
  postDeliveryHoldDays: number;
  sellerResponseDeadlineDays: number;
  returnWindowDays: number;
  abandonedCheckoutMinutes: number;
}) {
  return prisma.marketplaceSettings.upsert({
    where: { id: SETTINGS_ID },
    update: data,
    create: { id: SETTINGS_ID, ...data },
  });
}
