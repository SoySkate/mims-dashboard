import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

const ACTIVE = ["confirmado", "pendiente_confirmacion_cliente"];

type OverlapArgs = {
  negocioId: string;
  fecha: string; // YYYY-MM-DD
  horaInicio: string; // HH:MM:SS
  horaFin: string; // HH:MM:SS
  profesionalId: string | null;
  profesional: string | null;
  excludeId?: string; // ignore this reserva (when moving it)
};

/**
 * True if an ACTIVE reserva for the SAME professional overlaps the given slot.
 *
 * A reserva "occupies" a professional identified by profesionalId, or by the
 * `profesional` text when no id is set (the seed data uses text, id NULL).
 * If there is NO professional (e.g. restaurant "Mesa para N"), there is no
 * single-person constraint, so overlap is allowed (multiple tables at once).
 *
 * Always scoped by negocioId — never trust ids across tenants.
 */
export async function hasOverlap(args: OverlapArgs): Promise<boolean> {
  const { negocioId, fecha, horaInicio, horaFin, profesionalId, profesional, excludeId } = args;

  // No professional -> no person-overlap constraint (restaurant case).
  if (!profesionalId && !profesional) return false;

  const profCond = profesionalId
    ? sql`r.profesional_id = ${profesionalId}`
    : sql`r.profesional_id is null and r.profesional = ${profesional}`;

  const exclude = excludeId ? sql`and r.id <> ${excludeId}` : sql``;

  const res = await db.execute(sql`
    select 1
    from reservas r
    where r.negocio_id = ${negocioId}
      and r.fecha = ${fecha}::date
      and r.estado in (${sql.join(ACTIVE.map((s) => sql`${s}`), sql`, `)})
      and (${profCond})
      and r.hora_inicio < ${horaFin}::time
      and r.hora_fin   > ${horaInicio}::time
      ${exclude}
    limit 1
  `);

  return res.rows.length > 0;
}
