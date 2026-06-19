/**
 * F3 verification: exercises the overlap SQL (same logic as overlap.ts) against the
 * real seed data. overlap.ts itself imports "server-only" so it can't run under tsx;
 * this inlines the identical query to prove the semantics.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { db, pool } from "@/lib/db/client";

const ACTIVE = ["confirmado", "pendiente_confirmacion_cliente"];
const CLINICA = "22222222-2222-2222-2222-222222222222";

async function overlap(args: {
  negocioId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  profesional: string | null;
  excludeId?: string;
}): Promise<boolean> {
  if (!args.profesional) return false; // no professional -> no constraint
  const exclude = args.excludeId ? sql`and r.id <> ${args.excludeId}` : sql``;
  const res = await db.execute(sql`
    select 1 from reservas r
    where r.negocio_id = ${args.negocioId}
      and r.fecha = ${args.fecha}::date
      and r.estado in (${sql.join(ACTIVE.map((s) => sql`${s}`), sql`, `)})
      and (r.profesional_id is null and r.profesional = ${args.profesional})
      and r.hora_inicio < ${args.horaFin}::time
      and r.hora_fin   > ${args.horaInicio}::time
      ${exclude}
    limit 1`);
  return res.rows.length > 0;
}

async function check(name: string, got: boolean, want: boolean) {
  console.log(`${got === want ? "✓" : "✗ FAIL"}  ${name}  -> ${got} (want ${want})`);
}

async function main() {
  // existing: Anna Roca, Dra. Andrea Galve, 2026-06-01 16:00-16:40 (confirmado)
  const idAnna = (
    await db.execute(sql`select id from reservas where cliente_nombre='Anna Roca' limit 1`)
  ).rows[0]?.id as string;

  await check("A overlap mid-slot (16:20-17:00, same prof)",
    await overlap({ negocioId: CLINICA, fecha: "2026-06-01", horaInicio: "16:20:00", horaFin: "17:00:00", profesional: "Dra. Andrea Galve" }), true);

  await check("B back-to-back (16:40-17:10, same prof)",
    await overlap({ negocioId: CLINICA, fecha: "2026-06-01", horaInicio: "16:40:00", horaFin: "17:10:00", profesional: "Dra. Andrea Galve" }), false);

  await check("C different professional same slot",
    await overlap({ negocioId: CLINICA, fecha: "2026-06-01", horaInicio: "16:00:00", horaFin: "16:40:00", profesional: "Dra. Francesca Llos" }), false);

  await check("D overlap but excluding the reserva itself (move in place)",
    await overlap({ negocioId: CLINICA, fecha: "2026-06-01", horaInicio: "16:20:00", horaFin: "17:00:00", profesional: "Dra. Andrea Galve", excludeId: idAnna }), false);

  await check("E other tenant cannot match (restaurant, profesional null)",
    await overlap({ negocioId: "8d0ce837-82a2-4d0f-bf55-95d581d7d680", fecha: "2026-06-13", horaInicio: "13:30:00", horaFin: "15:00:00", profesional: null }), false);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
