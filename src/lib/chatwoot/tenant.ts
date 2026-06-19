import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { negocios } from "@/lib/db/schema";
import { getWhatsappInboxId } from "./inboxes";
import { isChatwootConfigured } from "./client";

export type NegocioChatwoot = { accountId: string; inboxId: number };

/**
 * Resolve the Chatwoot account + WhatsApp inbox for ONE negocio (from the session).
 * Returns null when the negocio is not on Chatwoot, or has no WhatsApp inbox (e.g. the
 * number was released) — a valid "no configurado" state.
 *
 * SECURITY: callers pass negocioId from the session only. The returned accountId is the
 * sole account used in every Chatwoot call for this request, so a tenant can never read
 * another tenant's data.
 */
export async function getNegocioChatwoot(negocioId: string): Promise<NegocioChatwoot | null> {
  if (!isChatwootConfigured()) return null;

  const row = (
    await db
      .select({ accountId: negocios.chatwootAccountId, inboxId: negocios.chatwootInboxId })
      .from(negocios)
      .where(eq(negocios.id, negocioId))
      .limit(1)
  )[0];

  if (!row?.accountId) return null;

  // Use the cached inbox id, else auto-detect once and cache it.
  let inboxId = row.inboxId ? Number(row.inboxId) : null;
  if (!inboxId) {
    inboxId = await getWhatsappInboxId(row.accountId);
    if (inboxId) {
      await db
        .update(negocios)
        .set({ chatwootInboxId: String(inboxId) })
        .where(eq(negocios.id, negocioId));
    }
  }
  if (!inboxId) return null;

  return { accountId: row.accountId, inboxId };
}
