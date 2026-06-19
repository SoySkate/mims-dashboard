import type { ReservaEstado } from "./queries";

// Visual style + label per reserva estado. Imported by both server and client.
export const ESTADO_META: Record<ReservaEstado, { label: string; color: string; muted?: boolean }> = {
  confirmado: { label: "Confirmado", color: "#16a34a" }, // green
  pendiente_confirmacion_cliente: { label: "Pendiente", color: "#d97706" }, // amber
  cancelado: { label: "Cancelado", color: "#9ca3af", muted: true }, // grey
  descartado_cliente: { label: "Descartado", color: "#cbd5e1", muted: true }, // light grey
};

export const ESTADO_ORDER: ReservaEstado[] = [
  "confirmado",
  "pendiente_confirmacion_cliente",
  "cancelado",
  "descartado_cliente",
];
