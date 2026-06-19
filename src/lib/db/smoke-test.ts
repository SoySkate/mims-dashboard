/**
 * F0 smoke test: prove the app can reach the dev DB and read through Drizzle.
 * Run with: npm run db:smoke
 */
import { sql } from "drizzle-orm";
import { db, pool } from "./client";
import { negocios } from "./schema";

async function main() {
  console.log("→ Connecting to", process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ":****@"));

  const rows = await db
    .select({
      slug: negocios.slug,
      nombre: negocios.nombre,
      tipo: negocios.tipoVertical,
      activo: negocios.activo,
    })
    .from(negocios)
    .orderBy(negocios.nombre);

  console.log(`\n✓ negocios (${rows.length}):`);
  for (const n of rows) {
    console.log(`  - ${n.nombre}  [${n.slug}]  tipo=${n.tipo}  activo=${n.activo}`);
  }

  // Quick per-table sanity counts.
  const counts = await db.execute(sql`
    SELECT 'servicios' AS t, count(*)::int AS n FROM servicios
    UNION ALL SELECT 'profesionales', count(*)::int FROM profesionales
    UNION ALL SELECT 'reservas', count(*)::int FROM reservas
    UNION ALL SELECT 'historial', count(*)::int FROM historial
    ORDER BY t
  `);
  console.log("\n✓ row counts:");
  for (const r of counts.rows) console.log(`  - ${r.t}: ${r.n}`);

  console.log("\n✓ smoke test passed");
}

main()
  .catch((e) => {
    console.error("✗ smoke test failed:", e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
