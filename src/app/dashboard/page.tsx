import { sql, eq, and, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { reservas } from "@/lib/db/schema";
import { getCurrentUser, getNegocioId } from "@/lib/auth/dal";

// F1 proof-of-tenancy page: shows whose data we see + a couple of scoped counts.
// The real calendar (F2) and messages (F4) views come later.
export default async function DashboardPage() {
  const user = await getCurrentUser();
  const negocioId = await getNegocioId();

  // Every query is scoped by negocioId from the SESSION, never from the client.
  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      activas: sql<number>`count(*) filter (where ${inArray(
        reservas.estado,
        ["confirmado", "pendiente_confirmacion_cliente"],
      )})::int`,
    })
    .from(reservas)
    .where(eq(reservas.negocioId, negocioId));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Hola, {user.nombre ?? user.email}</h1>
        <p className="text-sm text-gray-500">
          Estás viendo los datos de <strong>{user.negocioNombre}</strong>.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-2xl font-semibold text-gray-900">{counts?.total ?? 0}</div>
          <div className="text-xs text-gray-500">Reservas (todas)</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-2xl font-semibold text-gray-900">{counts?.activas ?? 0}</div>
          <div className="text-xs text-gray-500">Reservas activas</div>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Próximo: F2 — calendario de reservas.
      </p>
    </div>
  );
}
