import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load dev env so `drizzle-kit pull/push` targets the local dev DB.
config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // The schema already exists in mims_app; we introspect it rather than own migrations.
  // `users` (created here) is the only table this app will own — see F1.
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
