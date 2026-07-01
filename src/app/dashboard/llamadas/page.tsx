import Link from "next/link";
import { getNegocioId } from "@/lib/auth/dal";
import { getNegocioChatwootCalls } from "@/lib/chatwoot/tenant";
import { listConversations, ALL_STATUSES } from "@/lib/chatwoot/conversations";
import { getThread, type ThreadMessage } from "@/lib/chatwoot/messages";
import { ChatwootError } from "@/lib/chatwoot/client";
import { getVozActiva } from "@/lib/negocio/voz";
import { Poller } from "../mensajes/poller";
import { VozToggle } from "./voz-toggle";

// READ-ONLY calls screen. Reads a SEPARATE Chatwoot inbox (Retell transcripts via n8n),
// reusing the existing Chatwoot client. No reply, no handoff, no mark-as-read.
export default async function LlamadasPage({
  searchParams,
}: {
  searchParams: Promise<{ conv?: string }>;
}) {
  const negocioId = await getNegocioId();
  const vozActiva = await getVozActiva(negocioId);
  const cfg = await getNegocioChatwootCalls(negocioId);

  // not configured, OR the configured account/inbox is unreachable (404) -> same graceful state.
  let conversations: Awaited<ReturnType<typeof listConversations>> | null = null;
  if (cfg) {
    try {
      conversations = await listConversations(cfg.accountId, cfg.inboxId, ALL_STATUSES);
    } catch (e) {
      if (!(e instanceof ChatwootError && e.status === 404)) throw e;
      // 404 -> account/inbox gone; fall through to "no configurado".
    }
  }

  if (!cfg || conversations === null) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-xl font-bold text-text">Llamadas</h1>
          <VozToggle initial={vozActiva} />
        </div>
        <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted">
          El inbox de llamadas no está configurado para este negocio en Chatwoot.
        </div>
      </div>
    );
  }

  const { conv } = await searchParams;

  const activeId = conv ? Number(conv) : conversations[0]?.id;
  let thread: ThreadMessage[] = [];
  let notFound = false;
  if (activeId) {
    try {
      // accountId from the session -> a foreign conversationId yields 404 (cross-tenant guard).
      thread = await getThread(cfg.accountId, activeId);
    } catch (e) {
      if (e instanceof ChatwootError && e.status === 404) notFound = true;
      else throw e;
    }
  }
  const activeConvo = conversations.find((c) => c.id === activeId);

  // Aggregate cost over the listed calls (degrades to nothing if no custom_attributes present).
  const anyCoste = conversations.some((c) => parseCallMeta(c.customAttributes).costeUsd != null);
  const totalCoste = conversations.reduce((s, c) => s + (parseCallMeta(c.customAttributes).costeUsd ?? 0), 0);
  const activeMeta = parseCallMeta(activeConvo?.customAttributes ?? null);

  return (
    <div className="flex flex-col gap-4">
      <Poller />
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-xl font-bold text-text">Llamadas</h1>
        <div className="flex flex-col items-end gap-1">
          <VozToggle initial={vozActiva} />
          {anyCoste && <span className="label-mono">Coste total · ${totalCoste.toFixed(2)}</span>}
        </div>
      </div>

      {conversations.length === 0 ? (
        <p className="text-sm text-muted">No hay llamadas todavía.</p>
      ) : (
        <div className="flex h-[78vh] gap-0 md:h-[70vh] md:gap-4">
          {/* Mobile: list XOR thread by ?conv. Desktop (md+): both columns. */}
          <ul
            className={`${conv ? "hidden" : "block"} w-full shrink-0 overflow-y-auto rounded-xl border border-border bg-surface md:block md:w-72`}
          >
            {conversations.map((c) => {
              const active = c.id === activeId;
              const cMeta = parseCallMeta(c.customAttributes);
              return (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/llamadas?conv=${c.id}`}
                    className={`block border-b border-border px-3 py-2.5 transition-colors ${
                      active ? "bg-elevated" : "hover:bg-elevated/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-text">
                        {c.name || c.phone || `#${c.id}`}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted">{fmtDate(c.lastActivityAt)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted">{c.lastMessage || "—"}</span>
                      {cMeta.costeUsd != null && (
                        <span className="shrink-0 text-[10px] font-medium text-accent">
                          ${cMeta.costeUsd.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div
            className={`${conv ? "flex" : "hidden"} min-w-0 flex-1 flex-col rounded-xl border border-border bg-surface md:flex`}
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <Link
                href="/dashboard/llamadas"
                aria-label="Volver a la lista"
                className="-ml-1 rounded p-1 text-muted hover:text-text md:hidden"
              >
                ←
              </Link>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-text">
                  {activeConvo?.name || activeConvo?.phone || (activeId ? `#${activeId}` : "—")}
                </div>
                <div className="text-xs text-muted">{activeConvo?.phone}</div>
              </div>
              {(activeMeta.costeUsd != null || activeMeta.duracionS != null || activeMeta.agente) && (
                <div className="ml-auto flex shrink-0 flex-col items-end gap-0.5 text-right sm:flex-row sm:items-center sm:gap-4">
                  {activeMeta.costeUsd != null && <Meta label="Coste" value={`$${activeMeta.costeUsd.toFixed(3)}`} />}
                  {activeMeta.duracionS != null && <Meta label="Duración" value={fmtDur(activeMeta.duracionS)} />}
                  {activeMeta.agente && <Meta label="Agente" value={activeMeta.agente} />}
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-bg/40 p-4">
              {notFound ? (
                <p className="m-auto text-sm text-muted">Llamada no encontrada.</p>
              ) : (
                thread.map((m) => <Bubble key={m.id} m={m} />)
              )}
            </div>
            {/* READ-ONLY: no reply box, no handoff. */}
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({ m }: { m: ThreadMessage }) {
  if (m.direction === "activity") {
    return (
      <div className="self-center rounded bg-elevated px-2 py-1 text-center text-[11px] text-muted">
        {m.content}
      </div>
    );
  }
  // In a call transcript: incoming = caller, outgoing = agent/bot.
  const isIn = m.direction === "in";
  const body = m.content || <span className="text-muted">(sin texto)</span>;
  return (
    <div className={`flex flex-col ${isIn ? "items-start" : "items-end"}`}>
      <div
        className={`max-w-[80%] overflow-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-2xl px-3 py-2 text-sm text-text ${
          isIn ? "rounded-bl-sm bg-elevated" : "rounded-br-sm bg-accent/20"
        }`}
      >
        {body}
      </div>
      <span className="mt-0.5 px-1 text-[10px] text-muted">{fmtTime(m.createdAt)}</span>
    </div>
  );
}

type CallMeta = { costeUsd: number | null; duracionS: number | null; agente: string | null };

// Read cost/duration/agent from Chatwoot conversation custom_attributes (set by the n8n
// call flow). Tolerant of string/number and a few key spellings. All null when absent.
function parseCallMeta(ca: Record<string, unknown> | null | undefined): CallMeta {
  const num = (v: unknown) => {
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
  };
  const str = (v: unknown) => (v == null || v === "" ? null : String(v));
  if (!ca) return { costeUsd: null, duracionS: null, agente: null };
  return {
    costeUsd: num(ca.coste_usd ?? ca.cost_usd ?? ca.coste ?? ca.cost),
    duracionS: num(ca.duracion_s ?? ca.duration_s ?? ca.duracion ?? ca.duration),
    agente: str(ca.agente ?? ca.agent ?? ca.agent_id),
  };
}

function fmtDur(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1 whitespace-nowrap">
      <span className="label-mono">{label}</span>
      <span className="text-xs font-medium text-text">{value}</span>
    </span>
  );
}

function fmtDate(epochSec: number): string {
  if (!epochSec) return "";
  const d = new Date(epochSec * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}`;
}
function fmtTime(epochSec: number): string {
  if (!epochSec) return "";
  const d = new Date(epochSec * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
