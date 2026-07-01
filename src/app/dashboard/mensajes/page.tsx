import Link from "next/link";
import { getNegocioId } from "@/lib/auth/dal";
import { getNegocioChatwoot } from "@/lib/chatwoot/tenant";
import { listConversations, markConversationRead } from "@/lib/chatwoot/conversations";
import { getThread, type ThreadMessage } from "@/lib/chatwoot/messages";
import { ChatwootError } from "@/lib/chatwoot/client";
import { getAgenteActivo } from "@/lib/negocio/agente";
import { Poller } from "./poller";
import { ReplyBox } from "./reply-box";
import { HandoffButton } from "./handoff-button";
import { AgenteToggle } from "./agente-toggle";

export default async function MensajesPage({
  searchParams,
}: {
  searchParams: Promise<{ conv?: string }>;
}) {
  const negocioId = await getNegocioId();
  const agenteActivo = await getAgenteActivo(negocioId);
  const cfg = await getNegocioChatwoot(negocioId);

  if (!cfg) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-xl font-bold text-text">Mensajes de WhatsApp</h1>
          <AgenteToggle initial={agenteActivo} />
        </div>
        <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted">
          WhatsApp no está configurado para este negocio en Chatwoot.
        </div>
      </div>
    );
  }

  const { conv } = await searchParams;
  const conversations = await listConversations(cfg.accountId, cfg.inboxId);

  // Selected conversation: explicit ?conv= or the most recent. Validate it belongs to
  // THIS account by fetching its thread; a foreign id yields 404 -> "no encontrada".
  const activeId = conv ? Number(conv) : conversations[0]?.id;
  let thread: ThreadMessage[] = [];
  let notFound = false;
  if (activeId) {
    try {
      thread = await getThread(cfg.accountId, activeId);
      // Opening it = the agent saw it: reset Chatwoot's unread counter, and zero the badge
      // locally so the list reflects it immediately (don't fail the page if this errors).
      try {
        await markConversationRead(cfg.accountId, activeId);
        const c = conversations.find((x) => x.id === activeId);
        if (c) c.unread = 0;
      } catch {}
    } catch (e) {
      if (e instanceof ChatwootError && e.status === 404) notFound = true;
      else throw e;
    }
  }
  const activeConvo = conversations.find((c) => c.id === activeId);

  return (
    <div className="flex flex-col gap-4">
      <Poller />
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-xl font-bold text-text">Mensajes de WhatsApp</h1>
        <AgenteToggle initial={agenteActivo} />
      </div>

      {conversations.length === 0 ? (
        <p className="text-sm text-muted">No hay conversaciones activas.</p>
      ) : (
        <div className="flex h-[78vh] gap-0 md:h-[70vh] md:gap-4">
          {/* Mobile (WhatsApp-style): list when no conv selected, thread when one is.
              Desktop (md+): both columns always. */}
          <ul
            className={`${conv ? "hidden" : "block"} w-full shrink-0 overflow-y-auto rounded-xl border border-border bg-surface md:block md:w-72`}
          >
            {conversations.map((c) => {
              const active = c.id === activeId;
              return (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/mensajes?conv=${c.id}`}
                    className={`block border-b border-border px-3 py-2.5 transition-colors ${
                      active ? "bg-elevated" : "hover:bg-elevated/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-text">
                        {c.name || c.phone || `#${c.id}`}
                      </span>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted">{c.lastMessage || "—"}</span>
                      {c.unread > 0 && (
                        <span className="shrink-0 rounded-full bg-accent px-1.5 text-[10px] font-semibold text-on-accent">
                          {c.unread}
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
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Link
                  href="/dashboard/mensajes"
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
              </div>
              {activeConvo && (
                <div className="flex items-center gap-2">
                  <StatusBadge status={activeConvo.status} />
                  <HandoffButton conversationId={activeConvo.id} status={activeConvo.status} />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-bg/40 p-4">
              {notFound ? (
                <p className="m-auto text-sm text-muted">Conversación no encontrada.</p>
              ) : (
                thread.map((m) => <Bubble key={m.id} m={m} />)
              )}
            </div>
            {activeId && !notFound && <ReplyBox conversationId={activeId} />}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const open = status === "open";
  // open = human handling (caqui/secondary); pending = bot active (amber/accent).
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
        open ? "bg-secondary/20 text-secondary" : "bg-accent/15 text-accent"
      }`}
      title={open ? "Atendida por humano" : "Bot activo"}
    >
      {open ? "humano" : "bot"}
    </span>
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
  const isIn = m.direction === "in";
  const body =
    m.content || (m.attachments.length > 0 ? "🎤 audio / adjunto" : <span className="text-muted">(vacío)</span>);
  return (
    <div className={`flex flex-col ${isIn ? "items-start" : "items-end"}`}>
      {m.private && <span className="px-1 text-[10px] text-secondary">nota interna</span>}
      <div
        className={`max-w-[80%] overflow-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-2xl px-3 py-2 text-sm text-text ${
          m.private
            ? "border border-border bg-elevated"
            : isIn
              ? "rounded-bl-sm bg-elevated"
              : "rounded-br-sm bg-accent/20"
        }`}
      >
        {body}
      </div>
      <span className="mt-0.5 px-1 text-[10px] text-muted">{fmtTime(m.createdAt)}</span>
    </div>
  );
}

function fmtTime(epochSec: number): string {
  if (!epochSec) return "";
  const d = new Date(epochSec * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
