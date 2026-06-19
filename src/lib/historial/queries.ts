import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { historial } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export type ConversationSummary = {
  telefono: string;
  nombre: string | null;
  lastMensaje: string;
  lastRole: string;
  lastAt: string;
  n: number;
};

export type Message = {
  id: number;
  role: string;
  mensaje: string;
  createdAt: string;
};

/**
 * One row per cliente_telefono for a tenant: last message + count + last timestamp.
 * Scoped by negocioId (session). Ordered by most recent activity.
 */
export async function getConversations(negocioId: string): Promise<ConversationSummary[]> {
  const res = await db.execute(sql`
    with last as (
      select distinct on (cliente_telefono)
        cliente_telefono, cliente_nombre, mensaje, role, created_at
      from historial
      where negocio_id = ${negocioId}
      order by cliente_telefono, created_at desc, id desc
    ),
    cnt as (
      select cliente_telefono, count(*)::int as n
      from historial
      where negocio_id = ${negocioId}
      group by cliente_telefono
    )
    select
      l.cliente_telefono as "telefono",
      l.cliente_nombre   as "nombre",
      l.mensaje          as "lastMensaje",
      l.role             as "lastRole",
      l.created_at       as "lastAt",
      cnt.n              as "n"
    from last l
    join cnt using (cliente_telefono)
    order by l.created_at desc
  `);
  return res.rows as unknown as ConversationSummary[];
}

/**
 * Full thread for one cliente_telefono. Scoped by BOTH negocioId and telefono so a
 * tenant can never read another tenant's messages by passing a phone number.
 */
export async function getMessages(negocioId: string, telefono: string): Promise<Message[]> {
  const rows = await db
    .select({
      id: historial.id,
      role: historial.role,
      mensaje: historial.mensaje,
      createdAt: historial.createdAt,
    })
    .from(historial)
    .where(and(eq(historial.negocioId, negocioId), eq(historial.clienteTelefono, telefono)))
    .orderBy(asc(historial.createdAt), asc(historial.id));

  return rows.map((r) => ({
    id: r.id,
    role: r.role,
    mensaje: r.mensaje,
    createdAt: r.createdAt ?? "",
  }));
}
