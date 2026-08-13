import { prisma } from "@/lib/prisma";

/**
 * MVP admin auth (see lib/auth.ts) is a single shared login, not per-person accounts —
 * so there's no logged-in User row to attach review actions to. This resolves/creates a
 * single "system" Admin record (keyed off ADMIN_EMAIL) so ApplicationReview/EnforcementAction
 * rows have a valid adminId. Replace once real admin accounts exist.
 */
export async function getSystemAdmin() {
  const email = process.env.ADMIN_EMAIL ?? "admin@giuseppe.com";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, role: "ADMIN" },
  });
  const admin = await prisma.admin.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, name: "Giuseppe Admin" },
  });
  return admin;
}
