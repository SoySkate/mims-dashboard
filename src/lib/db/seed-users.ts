/**
 * Seed one demo login per business. Dev only. Idempotent (upsert by lower(email)).
 * Run: npm run db:seed:users
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db, pool } from "./client";
import { negocios } from "./schema";
import { users } from "./auth-schema";

const DEMO_PASSWORD = "demo1234";

async function main() {
  const all = await db.select({ id: negocios.id, slug: negocios.slug, nombre: negocios.nombre }).from(negocios);
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Idempotent: clear demo logins, then re-insert one per business.
  await db.delete(users).where(sql`email like '%@demo.mims'`);

  for (const n of all) {
    const email = `${n.slug}@demo.mims`;
    await db
      .insert(users)
      .values({ negocioId: n.id, email, passwordHash: hash, nombre: `Dueño ${n.nombre}`, role: "owner" });
    console.log(`  ✓ ${email}  ->  ${n.nombre}`);
  }

  console.log(`\nSeeded ${all.length} users. Password for all: "${DEMO_PASSWORD}"`);
}

main()
  .catch((e) => {
    console.error("✗ seed-users failed:", e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
