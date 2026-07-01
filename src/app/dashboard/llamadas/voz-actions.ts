"use server";

import { revalidatePath } from "next/cache";
import { getNegocioId } from "@/lib/auth/dal";
import { setVozActiva } from "@/lib/negocio/voz";

export type VozResult = { ok: true } | { ok: false; error: string };

/**
 * Toggle the voice bot for the SESSION's negocio. negocioId comes from the session only
 * (tenant isolation), never from the client — the client passes just the desired value.
 */
export async function setVozActivaAction(activa: boolean): Promise<VozResult> {
  const negocioId = await getNegocioId();
  try {
    await setVozActiva(negocioId, activa);
    revalidatePath("/dashboard/llamadas");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo cambiar el estado de las llamadas" };
  }
}
