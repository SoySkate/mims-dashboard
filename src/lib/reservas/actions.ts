"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/lib/db/client";
import { reservas, servicios } from "@/lib/db/schema";
import { getNegocioId } from "@/lib/auth/dal";
import { hasOverlap } from "./overlap";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

// ---- time helpers ----------------------------------------------------------
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}
function toHms(totalMin: number): string {
  const min = ((totalMin % 1440) + 1440) % 1440; // wrap into [0,1440)
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---- create ----------------------------------------------------------------
const CreateSchema = z.object({
  clienteNombre: z.string().trim().min(1, "Nombre requerido"),
  clienteTelefono: z.string().trim().optional(),
  servicioId: z.string().uuid("Servicio no válido"),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida"),
  horaInicio: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora no válida"),
});

export async function createReserva(input: unknown): Promise<ActionResult> {
  const negocioId = await getNegocioId();
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }
  const { clienteNombre, clienteTelefono, servicioId, fecha, horaInicio } = parsed.data;

  if (fecha < todayStr()) return { ok: false, error: "No se puede reservar en el pasado" };

  // Servicio must belong to THIS tenant.
  const srv = (
    await db
      .select({
        nombre: servicios.nombre,
        duracionMinutos: servicios.duracionMinutos,
        precio: servicios.precio,
        profesional: servicios.profesional,
      })
      .from(servicios)
      .where(and(eq(servicios.id, servicioId), eq(servicios.negocioId, negocioId)))
      .limit(1)
  )[0];
  if (!srv) return { ok: false, error: "Servicio no encontrado" };

  const start = horaInicio.length === 5 ? `${horaInicio}:00` : horaInicio;
  const horaFin = toHms(toMinutes(horaInicio) + srv.duracionMinutos);

  if (
    await hasOverlap({
      negocioId,
      fecha,
      horaInicio: start,
      horaFin,
      profesionalId: null,
      profesional: srv.profesional,
    })
  ) {
    return { ok: false, error: `Solapa con otra reserva de ${srv.profesional ?? "ese horario"}` };
  }

  const [row] = await db
    .insert(reservas)
    .values({
      negocioId,
      clienteNombre,
      clienteTelefono: clienteTelefono || null,
      serviciosResumen: srv.nombre,
      duracionMinutos: srv.duracionMinutos,
      precioTotal: srv.precio,
      fecha,
      horaInicio: start,
      horaFin,
      profesional: srv.profesional,
      estado: "confirmado", // owner-created from the dashboard
    })
    .returning({ id: reservas.id });

  revalidatePath("/dashboard/calendario");
  return { ok: true, id: row.id };
}

// ---- move (drag) -----------------------------------------------------------
const MoveSchema = z.object({
  id: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaInicio: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
});

export async function moveReserva(input: unknown): Promise<ActionResult> {
  const negocioId = await getNegocioId();
  const parsed = MoveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos no válidos" };
  const { id, fecha, horaInicio } = parsed.data;

  if (fecha < todayStr()) return { ok: false, error: "No se puede mover al pasado" };

  // Load the reserva scoped to THIS tenant (never trust the id alone).
  const current = (
    await db
      .select({
        duracionMinutos: reservas.duracionMinutos,
        horaInicio: reservas.horaInicio,
        horaFin: reservas.horaFin,
        profesional: reservas.profesional,
        profesionalId: reservas.profesionalId,
        estado: reservas.estado,
      })
      .from(reservas)
      .where(and(eq(reservas.id, id), eq(reservas.negocioId, negocioId)))
      .limit(1)
  )[0];
  if (!current) return { ok: false, error: "Reserva no encontrada" };

  const start = horaInicio.length === 5 ? `${horaInicio}:00` : horaInicio;
  const durationMin =
    current.duracionMinutos ?? toMinutes(current.horaFin) - toMinutes(current.horaInicio);
  const horaFin = toHms(toMinutes(start) + durationMin);

  if (
    await hasOverlap({
      negocioId,
      fecha,
      horaInicio: start,
      horaFin,
      profesionalId: current.profesionalId,
      profesional: current.profesional,
      excludeId: id,
    })
  ) {
    return { ok: false, error: "Solapa con otra reserva" };
  }

  await db
    .update(reservas)
    .set({ fecha, horaInicio: start, horaFin })
    .where(and(eq(reservas.id, id), eq(reservas.negocioId, negocioId)));

  revalidatePath("/dashboard/calendario");
  return { ok: true, id };
}

// ---- cancel ----------------------------------------------------------------
export async function cancelReserva(id: string): Promise<ActionResult> {
  const negocioId = await getNegocioId();
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Id no válido" };

  const res = await db
    .update(reservas)
    .set({ estado: "cancelado" })
    .where(and(eq(reservas.id, id), eq(reservas.negocioId, negocioId)))
    .returning({ id: reservas.id });

  if (res.length === 0) return { ok: false, error: "Reserva no encontrada" };

  revalidatePath("/dashboard/calendario");
  return { ok: true, id };
}
