"use server";

import { revalidatePath } from "next/cache";
import { getNegocioId } from "@/lib/auth/dal";
import { setAgenteActivo } from "@/lib/negocio/agente";

export type AgenteResult = { ok: true } | { ok: false; error: string };

/**
 * Toggle the messages bot for the SESSION's negocio. negocioId comes from the session only
 * (tenant isolation), never from the client — the client passes just the desired value.
 */
export async function setAgenteActivoAction(activa: boolean): Promise<AgenteResult> {
  const negocioId = await getNegocioId();
  try {
    await setAgenteActivo(negocioId, activa);
    revalidatePath("/dashboard/mensajes");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo cambiar el estado del bot de mensajes" };
  }
}
