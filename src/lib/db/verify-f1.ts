/**
 * F1 verification helper. Mints a valid session JWT (same scheme as the app) for two
 * different businesses and checks bcrypt. Prints tokens for the curl-based tenant test.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "./client";
import { users } from "./auth-schema";
import { negocios } from "./schema";

const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET!);

async function mint(userId: string, negocioId: string, role: string) {
  return new SignJWT({ userId, negocioId, role, expiresAt: Date.now() + 7 * 864e5 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

async function forSlug(slug: string) {
  const rows = await db
    .select({ id: users.id, negocioId: users.negocioId, role: users.role, hash: users.passwordHash, nombre: negocios.nombre })
    .from(users)
    .innerJoin(negocios, eq(users.negocioId, negocios.id))
    .where(eq(sql`lower(${users.email})`, `${slug}@demo.mims`))
    .limit(1);
  const u = rows[0];
  const okGood = await bcrypt.compare("demo1234", u.hash);
  const okBad = await bcrypt.compare("wrongpass", u.hash);
  const token = await mint(u.id, u.negocioId, u.role);
  console.log(`SLUG=${slug} NEGOCIO="${u.nombre}" BCRYPT_GOOD=${okGood} BCRYPT_BAD=${okBad}`);
  console.log(`TOKEN_${slug.replace(/-/g, "_")}=${token}`);
}

async function main() {
  await forSlug("clinica-dentos");
  await forSlug("la-tasqueta-llivia");
  await forSlug("centre-de-psicologia-baobab");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
