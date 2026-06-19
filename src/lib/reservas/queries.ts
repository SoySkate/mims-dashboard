import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { reservas, servicios } from "@/lib/db/schema";

export type ServicioOption = {
  id: string;
  nombre: string;
  duracionMinutos: number;
  precio: string;
  profesional: string | null;
};

/** Active servicios for ONE tenant (for the create form). Scoped by negocioId. */
export async function getServicios(negocioId: string): Promise<ServicioOption[]> {
  return db
    .select({
      id: servicios.id,
      nombre: servicios.nombre,
      duracionMinutos: servicios.duracionMinutos,
      precio: servicios.precio,
      profesional: servicios.profesional,
    })
    .from(servicios)
    .where(and(eq(servicios.negocioId, negocioId), eq(servicios.activo, true)))
    .orderBy(servicios.nombre);
}

export type ReservaEstado =
  | "pendiente_confirmacion_cliente"
  | "confirmado"
  | "cancelado"
  | "descartado_cliente";

// Plain-JSON shape passed from the server page to the client calendar.
export type CalendarEvent = {
  id: string;
  title: string;
  start: string; // "YYYY-MM-DDTHH:mm:ss" (local, no TZ suffix)
  end: string;
  estado: ReservaEstado;
  clienteNombre: string | null;
  clienteTelefono: string | null;
  servicio: string | null;
  profesional: string | null;
  precio: string | null;
};

/**
 * All reservas for ONE tenant, shaped as calendar events.
 * `negocioId` MUST come from the session (DAL), never the client.
 */
export async function getReservasForCalendar(negocioId: string): Promise<CalendarEvent[]> {
  const rows = await db
    .select({
      id: reservas.id,
      fecha: reservas.fecha,
      horaInicio: reservas.horaInicio,
      horaFin: reservas.horaFin,
      estado: reservas.estado,
      clienteNombre: reservas.clienteNombre,
      clienteTelefono: reservas.clienteTelefono,
      servicio: reservas.serviciosResumen,
      profesional: reservas.profesional,
      precio: reservas.precioTotal,
    })
    .from(reservas)
    .where(eq(reservas.negocioId, negocioId));

  return rows.map((r) => ({
    id: r.id,
    title: [r.clienteNombre ?? "Sin nombre", r.servicio].filter(Boolean).join(" · "),
    start: `${r.fecha}T${r.horaInicio}`,
    end: `${r.fecha}T${r.horaFin}`,
    estado: r.estado as ReservaEstado,
    clienteNombre: r.clienteNombre,
    clienteTelefono: r.clienteTelefono,
    servicio: r.servicio,
    profesional: r.profesional,
    precio: r.precio,
  }));
}
