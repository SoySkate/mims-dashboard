import "dotenv/config";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Ensure .env.local is loaded for scripts run outside Next.js (e.g. tsx smoke tests).
config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Check .env.local");
}

// Single shared pool. In dev, Next.js hot-reload can create many pools;
// cache it on globalThis to avoid exhausting connections.
const globalForDb = globalThis as unknown as { __mimsPool?: Pool };

export const pool =
  globalForDb.__mimsPool ?? new Pool({ connectionString, max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__mimsPool = pool;
}

export const db = drizzle(pool);
