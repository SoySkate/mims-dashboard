import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/auth-schema";
import { negocios } from "@/lib/db/schema";
import { readSession, type SessionPayload } from "./session";

/**
 * Data Access Layer. The ONLY sanctioned way to obtain the current tenant scope.
 * `verifySession` redirects to /login when there is no valid session, so callers
 * can assume a session afterwards. Memoized per render pass with React cache().
 */
export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await readSession();
  if (!session?.userId || !session?.negocioId) {
    redirect("/login");
  }
  return session;
});

/** Tenant id for the current request. NEVER accept a negocioId from the client. */
export const getNegocioId = cache(async (): Promise<string> => {
  const { negocioId } = await verifySession();
  return negocioId;
});

/** Current user + their negocio, scoped by the session. Returns minimal fields (DTO). */
export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      nombre: users.nombre,
      role: users.role,
      negocioId: users.negocioId,
      negocioNombre: negocios.nombre,
      negocioSlug: negocios.slug,
    })
    .from(users)
    .innerJoin(negocios, eq(users.negocioId, negocios.id))
    .where(eq(users.id, session.userId))
    .limit(1);

  const user = rows[0];
  if (!user) {
    // user row vanished after session was issued -> treat as logged out
    redirect("/login");
  }
  return user;
});
