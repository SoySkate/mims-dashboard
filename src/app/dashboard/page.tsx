import Link from "next/link";
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
        <h1 className="font-display text-2xl font-bold text-text">
          Hola, {user.nombre ?? user.email}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Estás viendo los datos de <span className="text-text">{user.negocioNombre}</span>.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:max-w-md sm:gap-4">
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <div className="font-display text-3xl font-bold text-text">{counts?.total ?? 0}</div>
          <div className="label-mono mt-1">Reservas · todas</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <div className="font-display text-3xl font-bold text-accent">{counts?.activas ?? 0}</div>
          <div className="label-mono mt-1">Reservas · activas</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:max-w-md sm:grid-cols-2">
        <QuickLink href="/dashboard/calendario" label="Calendario" hint="Ver y gestionar reservas" />
        <QuickLink href="/dashboard/mensajes" label="Mensajes" hint="WhatsApp en vivo" />
      </div>
    </div>
  );
}

function QuickLink({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent"
    >
      <div>
        <div className="text-sm font-semibold text-text">{label}</div>
        <div className="text-xs text-muted">{hint}</div>
      </div>
      <span className="text-muted transition-colors group-hover:text-accent">→</span>
    </Link>
  );
}
