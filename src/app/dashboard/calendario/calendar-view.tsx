"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import type { EventClickArg, EventDropArg, DateSelectArg } from "@fullcalendar/core";
import type { CalendarEvent, ServicioOption } from "@/lib/reservas/queries";
import { ESTADO_META, ESTADO_ORDER } from "@/lib/reservas/estado";
import { createReserva, moveReserva, cancelReserva } from "@/lib/reservas/actions";

// Date -> local "YYYY-MM-DD" / "HH:MM:SS" (avoid UTC shift from toISOString).
function localParts(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    fecha: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    hora: `${p(d.getHours())}:${p(d.getMinutes())}`,
  };
}

type CreatePrefill = { fecha: string; hora: string };

export function CalendarView({
  events,
  servicios,
  sinControlCapacidad = false,
}: {
  events: CalendarEvent[];
  servicios: ServicioOption[];
  sinControlCapacidad?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [createPrefill, setCreatePrefill] = useState<CreatePrefill | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fcEvents = useMemo(
    () =>
      events.map((e) => {
        const meta = ESTADO_META[e.estado];
        const movable = !meta.muted; // don't drag cancelled/discarded
        return {
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end,
          backgroundColor: meta.color,
          borderColor: meta.color,
          editable: movable,
          classNames: meta.muted ? ["opacity-60", "line-through"] : [],
          extendedProps: e,
        };
      }),
    [events],
  );

  function onEventClick(arg: EventClickArg) {
    setSelected(arg.event.extendedProps as CalendarEvent);
  }

  function onSelect(arg: DateSelectArg) {
    const { fecha, hora } = localParts(arg.start);
    setError(null);
    setCreatePrefill({ fecha, hora: arg.allDay ? "09:00" : hora });
  }

  function onEventDrop(arg: EventDropArg) {
    if (!arg.event.start) return;
    const { fecha, hora } = localParts(arg.event.start);
    setError(null);
    startTransition(async () => {
      const res = await moveReserva({ id: arg.event.id, fecha, horaInicio: hora });
      if (!res.ok) {
        setError(res.error);
        arg.revert(); // put the event back where it was
      } else {
        router.refresh();
      }
    });
  }

  function onCancel(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await cancelReserva(id);
      if (!res.ok) setError(res.error);
      else {
        setSelected(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white p-3">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {ESTADO_ORDER.map((estado) => (
            <span key={estado} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: ESTADO_META[estado].color }}
              />
              {ESTADO_META[estado].label}
            </span>
          ))}
          <span className="ml-auto text-xs text-gray-400">
            Arrastra para mover · selecciona un hueco para crear
          </span>
        </div>

        {error && (
          <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          locale={esLocale}
          firstDay={1}
          nowIndicator
          slotMinTime="07:00:00"
          slotMaxTime="23:30:00"
          allDaySlot={false}
          height="auto"
          expandRows
          selectable
          select={onSelect}
          editable
          eventStartEditable
          eventDurationEditable={false}
          eventDrop={onEventDrop}
          events={fcEvents}
          eventClick={onEventClick}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        />
      </div>

      <aside className="w-full shrink-0 lg:w-72">
        <button
          onClick={() => {
            setError(null);
            setCreatePrefill({ fecha: localParts(new Date()).fecha, hora: "09:00" });
          }}
          className="mb-3 w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Nueva reserva
        </button>

        {selected ? (
          <DetailPanel
            event={selected}
            pending={pending}
            onClose={() => setSelected(null)}
            onCancel={onCancel}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-400">
            Haz clic en una reserva para ver los detalles.
          </div>
        )}
      </aside>

      {createPrefill && (
        <CreateModal
          servicios={servicios}
          prefill={createPrefill}
          pending={pending}
          sinControlCapacidad={sinControlCapacidad}
          onClose={() => setCreatePrefill(null)}
          onSubmit={(payload) => {
            setError(null);
            startTransition(async () => {
              const res = await createReserva(payload);
              if (!res.ok) setError(res.error);
              else {
                setCreatePrefill(null);
                router.refresh();
              }
            });
          }}
        />
      )}
    </div>
  );
}

function DetailPanel({
  event,
  pending,
  onClose,
  onCancel,
}: {
  event: CalendarEvent;
  pending: boolean;
  onClose: () => void;
  onCancel: (id: string) => void;
}) {
  const meta = ESTADO_META[event.estado];
  const cancellable = event.estado === "confirmado" || event.estado === "pendiente_confirmacion_cliente";
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between">
        <span className="rounded px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: meta.color }}>
          {meta.label}
        </span>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-700">
          Cerrar
        </button>
      </div>
      <dl className="flex flex-col gap-2 text-sm">
        <Row label="Cliente" value={event.clienteNombre ?? "—"} />
        <Row label="Teléfono" value={event.clienteTelefono ?? "—"} />
        <Row label="Servicio" value={event.servicio ?? "—"} />
        <Row label="Profesional" value={event.profesional ?? "—"} />
        <Row label="Inicio" value={fmt(event.start)} />
        <Row label="Fin" value={fmt(event.end)} />
        <Row label="Precio" value={event.precio != null ? `${event.precio} €` : "—"} />
      </dl>
      {cancellable && (
        <button
          onClick={() => onCancel(event.id)}
          disabled={pending}
          className="mt-4 w-full rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {pending ? "…" : "Cancelar reserva"}
        </button>
      )}
    </div>
  );
}

function CreateModal({
  servicios,
  prefill,
  pending,
  sinControlCapacidad,
  onClose,
  onSubmit,
}: {
  servicios: ServicioOption[];
  prefill: CreatePrefill;
  pending: boolean;
  sinControlCapacidad: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    clienteNombre: string;
    clienteTelefono?: string;
    servicioId: string;
    fecha: string;
    horaInicio: string;
  }) => void;
}) {
  const [clienteNombre, setNombre] = useState("");
  const [clienteTelefono, setTel] = useState("");
  const [servicioId, setServicioId] = useState(servicios[0]?.id ?? "");
  const [fecha, setFecha] = useState(prefill.fecha);
  const [horaInicio, setHora] = useState(prefill.hora);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-base font-semibold text-gray-900">Nueva reserva</h2>
        {sinControlCapacidad && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            El control de disponibilidad de mesas no está activo: se permiten reservas
            solapadas. Revisa la capacidad manualmente.
          </p>
        )}
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ clienteNombre, clienteTelefono: clienteTelefono || undefined, servicioId, fecha, horaInicio });
          }}
        >
          <Field label="Cliente">
            <input required value={clienteNombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Teléfono (opcional)">
            <input value={clienteTelefono} onChange={(e) => setTel(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Servicio">
            <select required value={servicioId} onChange={(e) => setServicioId(e.target.value)} className={inputCls}>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} · {s.duracionMinutos}min{s.profesional ? ` · ${s.profesional}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex gap-3">
            <Field label="Fecha">
              <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Hora">
              <input type="time" required value={horaInicio} onChange={(e) => setHora(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || !servicioId}
              className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Creando…" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function fmt(s: string): string {
  const [date, time] = s.split("T");
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y} ${time?.slice(0, 5) ?? ""}`.trim();
}
