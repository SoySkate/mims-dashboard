import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { negocios } from "@/lib/db/schema";

/** Current messages-bot state for a negocio (negocios.agente_activo). */
export async function getAgenteActivo(negocioId: string): Promise<boolean> {
  const row = (
    await db.select({ v: negocios.agenteActivo }).from(negocios).where(eq(negocios.id, negocioId)).limit(1)
  )[0];
  return Boolean(row?.v);
}

/**
 * Set the messages-bot state for a negocio. Single source of truth for this change.
 *
 * FASE 2: reemplazar el UPDATE directo por llamada al Motor (que active/silencie el bot de
 * mensajes además de actualizar agente_activo). Que cambiar SOLO esta función baste —
 * la server action y la UI no deberían tocarse.
 */
export async function setAgenteActivo(negocioId: string, activa: boolean): Promise<void> {
  await db.update(negocios).set({ agenteActivo: activa }).where(eq(negocios.id, negocioId));
}
