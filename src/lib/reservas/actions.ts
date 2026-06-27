"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/lib/db/client";
import { reservas, servicios, negocios } from "@/lib/db/schema";
import { getNegocioId } from "@/lib/auth/dal";
import { hasOverlap } from "./overlap";
import { crearReservaMotor, MotorError } from "@/lib/motor/client";

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
  // clienteTelefono is validated by the schema but not part of the Motor's create payload.
  const { clienteNombre, servicioId, fecha, horaInicio } = parsed.data;

  if (fecha < todayStr()) return { ok: false, error: "No se puede reservar en el pasado" };

  // Servicio must belong to THIS tenant. The Motor matches by NAME, so we only need the name
  // (this also doubles as the tenant-ownership check on the servicio id from the form).
  const srv = (
    await db
      .select({ nombre: servicios.nombre })
      .from(servicios)
      .where(and(eq(servicios.id, servicioId), eq(servicios.negocioId, negocioId)))
      .limit(1)
  )[0];
  if (!srv) return { ok: false, error: "Servicio no encontrado" };

  // Owner phone -> the Motor skips the auto-notification for owner-originated bookings.
  const neg = (
    await db
      .select({ duenoTelefono: negocios.duenoTelefono })
      .from(negocios)
      .where(eq(negocios.id, negocioId))
      .limit(1)
  )[0];

  // Write via the n8n Motor (validates capacity/overlap/hours + writes Postgres itself).
  // clienteTelefono is collected by the form but the Motor's create payload doesn't take it.
  try {
    const r = await crearReservaMotor({
      negocioId,
      servicio: srv.nombre,
      fecha,
      hora: horaInicio.slice(0, 5), // HH:MM
      nombre: clienteNombre,
      fromNumber: neg?.duenoTelefono ?? undefined,
    });
    if (!r.ok) return r; // business rejection (OCUPADO, SIN_HUECOS, …) -> show the Motor's text
  } catch (e) {
    if (e instanceof MotorError) {
      return { ok: false, error: "No se pudo crear la reserva (Motor no disponible). Inténtalo de nuevo." };
    }
    throw e;
  }

  // The Motor wrote Postgres; re-read so the calendar reflects it (no id returned, not needed).
  revalidatePath("/dashboard/calendario");
  return { ok: true };
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
