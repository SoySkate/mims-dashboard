/**
 * Client for the n8n "Motor de reservas" (booking engine). SERVER-SIDE ONLY.
 *
 * The Motor validates capacity/overlap/opening-hours the same way the WhatsApp/voice bot
 * does, and writes Postgres itself. The dashboard calls it over HTTP for writes instead of
 * touching `reservas` directly. Synchronous: the POST response carries the outcome.
 *
 * Runtime window guard (not the `server-only` package) so tsx smoke tests can import it.
 * Env (no NEXT_PUBLIC_, never bundled into the browser):
 *   N8N_MOTOR_URL   - the Motor webhook URL (required)
 *   N8N_MOTOR_TOKEN - optional bearer token (webhook is open for now; sent only if set)
 */
if (typeof window !== "undefined") {
  throw new Error("motor/client is server-only and must not run in the browser");
}

function base() {
  return process.env.N8N_MOTOR_URL;
}
function token() {
  return process.env.N8N_MOTOR_TOKEN;
}

export function isMotorConfigured(): boolean {
  return Boolean(base());
}

/** Infra failure (network / non-2xx / empty body). Business rejections are NOT errors. */
export class MotorError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "MotorError";
  }
}

export type CrearReservaPayload = {
  negocioId: string;
  servicio: string; // service NAME (the Motor matches by name, not id)
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  nombre: string; // client name
  fromNumber?: string; // owner phone -> Motor skips the auto-notification
};

export type MotorResult = { ok: true } | { ok: false; error: string };

// A confirmed booking starts with this marker; anything else is a rejection (OCUPADO,
// ERROR, FALTA_NOMBRE, HORA_PASADA, SIN_HUECOS, CERRADO, NO_SERVICIO, ...).
const CONFIRMADO_PREFIX = "*Cita confirmada*";

/**
 * Create a reserva through the Motor. Returns {ok:true} on confirmation, {ok:false,error}
 * on a business rejection (the Motor's own text). Throws MotorError on infra failures.
 */
export async function crearReservaMotor(p: CrearReservaPayload): Promise<MotorResult> {
  const url = base();
  if (!url) throw new MotorError("NO_CONFIG", "Motor no configurado (falta N8N_MOTOR_URL)");

  const body = {
    fn: "crear",
    negocio_id: p.negocioId,
    servicio: p.servicio,
    fecha: p.fecha,
    hora: p.hora,
    nombre: p.nombre,
    confirmar: "si", // REQUIRED, otherwise the Motor only proposes
    ...(p.fromNumber ? { from_number: p.fromNumber } : {}),
  };

  const tk = token();
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new MotorError("NETWORK", `No se pudo contactar el Motor: ${(e as Error).message}`);
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new MotorError(`HTTP_${res.status}`, `Motor HTTP ${res.status} ${t.slice(0, 200)}`);
  }

  const data = (await res.json().catch(() => null)) as { response?: string } | null;
  const response = (data?.response ?? "").trim();
  if (!response) throw new MotorError("EMPTY", "El Motor no devolvió respuesta");

  if (response.startsWith(CONFIRMADO_PREFIX)) return { ok: true };
  return { ok: false, error: response }; // rejection: surface the Motor's text
}

/**
 * Toggle the voice bot via the Motor (fn "toggle_voz"). The Motor flips Telnyx call
 * forwarding AND writes negocios.voz_activa — the dashboard must NOT write voz_activa itself.
 * The Motor validates `from_number` is the owner (es_dueno gate); a mismatch is rejected.
 * Throws MotorError on any non-2xx (or network failure) so the caller can revert the UI.
 */
export async function toggleVozMotor(p: {
  negocioId: string;
  activa: boolean; // true = switch on -> "activar"; false = off -> "desactivar"
  fromNumber?: string; // owner phone (negocios.dueno_telefono)
}): Promise<void> {
  const url = base();
  if (!url) throw new MotorError("NO_CONFIG", "Motor no configurado (falta N8N_MOTOR_URL)");

  const body = {
    fn: "toggle_voz",
    negocio_id: p.negocioId,
    accion: p.activa ? "activar" : "desactivar",
    ...(p.fromNumber ? { from_number: p.fromNumber } : {}),
  };

  const tk = token();
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new MotorError("NETWORK", `No se pudo contactar el Motor: ${(e as Error).message}`);
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new MotorError(`HTTP_${res.status}`, `Motor HTTP ${res.status} ${t.slice(0, 200)}`);
  }
}
