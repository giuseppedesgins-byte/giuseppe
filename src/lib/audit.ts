import { prisma } from "@/lib/prisma";
import { ActorType } from "@prisma/client";

/**
 * Single write path for the audit log (spec §29) — used for both product status changes
 * and order/financial actions (refunds, cancellations, commission reversals, overrides).
 * Rows are append-only: nothing in the app calls .update()/.delete() on AuditLogEntry, and
 * sellers/admins have no UI path to edit or remove one.
 */
export async function logAudit(entry: {
  entityType: "PRODUCT" | "ORDER";
  entityId: string;
  action: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  actorType: ActorType;
  actorId?: string | null;
  actorLabel?: string | null;
  reason?: string | null;
  notes?: string | null;
  amountCents?: number | null;
  commissionBeforeCents?: number | null;
  commissionAfterCents?: number | null;
  refundCents?: number | null;
  metadata?: Record<string, unknown> | null;
}) {
  await prisma.auditLogEntry.create({
    data: {
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      previousStatus: entry.previousStatus ?? null,
      newStatus: entry.newStatus ?? null,
      actorType: entry.actorType,
      actorId: entry.actorId ?? null,
      actorLabel: entry.actorLabel ?? null,
      reason: entry.reason ?? null,
      notes: entry.notes ?? null,
      amountCents: entry.amountCents ?? null,
      commissionBeforeCents: entry.commissionBeforeCents ?? null,
      commissionAfterCents: entry.commissionAfterCents ?? null,
      refundCents: entry.refundCents ?? null,
      metadata: entry.metadata ? (entry.metadata as any) : undefined,
    },
  });
}
