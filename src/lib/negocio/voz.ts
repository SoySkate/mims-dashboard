import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { negocios } from "@/lib/db/schema";
import { toggleVozMotor } from "@/lib/motor/client";

/** Current voice-bot state for a negocio. */
export async function getVozActiva(negocioId: string): Promise<boolean> {
  const row = (
    await db.select({ v: negocios.vozActiva }).from(negocios).where(eq(negocios.id, negocioId)).limit(1)
  )[0];
  return Boolean(row?.v);
}

/**
 * Set the voice-bot state for a negocio via the n8n Motor (NOT a direct DB write).
 *
 * Turning voice on/off means flipping Telnyx call forwarding, which only the Motor webhook
 * can do; if the dashboard just wrote voz_activa, the DB and Telnyx would drift. So we POST
 * `toggle_voz` to the Motor, which flips Telnyx AND writes voz_activa. The Motor validates
 * the caller is the owner via `from_number` (= negocios.dueno_telefono).
 *
 * Throws on any non-2xx / network error so the UI reverts (optimistic switch).
 */
export async function setVozActiva(negocioId: string, activa: boolean): Promise<void> {
  const row = (
    await db
      .select({ duenoTelefono: negocios.duenoTelefono })
      .from(negocios)
      .where(eq(negocios.id, negocioId))
      .limit(1)
  )[0];

  await toggleVozMotor({ negocioId, activa, fromNumber: row?.duenoTelefono ?? undefined });
  // NO direct voz_activa UPDATE here — the Motor writes it after touching Telnyx.
}
