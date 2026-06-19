import { getNegocioId } from "@/lib/auth/dal";
import { getReservasForCalendar, getServicios } from "@/lib/reservas/queries";
import { CalendarView } from "./calendar-view";

export default async function CalendarioPage() {
  // negocioId from the session only. Every reserva read is scoped to this tenant.
  const negocioId = await getNegocioId();
  const [events, servicios] = await Promise.all([
    getReservasForCalendar(negocioId),
    getServicios(negocioId),
  ]);

  // Soft hint only: a negocio whose servicios have no professional (e.g. restaurant)
  // is NOT covered by the overlap check, which is per-professional. See CLAUDE.md debt.
  const sinControlCapacidad = servicios.length > 0 && servicios.every((s) => !s.profesional);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Calendario de reservas</h1>
        <p className="text-sm text-muted">{events.length} reservas</p>
      </div>
      <CalendarView events={events} servicios={servicios} sinControlCapacidad={sinControlCapacidad} />
    </div>
  );
}
