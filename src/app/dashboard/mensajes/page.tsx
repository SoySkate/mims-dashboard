import Link from "next/link";
import { getNegocioId } from "@/lib/auth/dal";
import { getNegocioChatwoot } from "@/lib/chatwoot/tenant";
import { listConversations } from "@/lib/chatwoot/conversations";
import { getThread, type ThreadMessage } from "@/lib/chatwoot/messages";
import { ChatwootError } from "@/lib/chatwoot/client";
import { Poller } from "./poller";
import { ReplyBox } from "./reply-box";
import { HandoffButton } from "./handoff-button";

export default async function MensajesPage({
  searchParams,
}: {
  searchParams: Promise<{ conv?: string }>;
}) {
  const negocioId = await getNegocioId();
  const cfg = await getNegocioChatwoot(negocioId);

  if (!cfg) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold text-gray-900">Mensajes de WhatsApp</h1>
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
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
    } catch (e) {
      if (e instanceof ChatwootError && e.status === 404) notFound = true;
      else throw e;
    }
  }
  const activeConvo = conversations.find((c) => c.id === activeId);

  return (
    <div className="flex flex-col gap-4">
      <Poller />
      <h1 className="text-lg font-semibold text-gray-900">Mensajes de WhatsApp</h1>

      {conversations.length === 0 ? (
        <p className="text-sm text-gray-500">No hay conversaciones activas.</p>
      ) : (
        <div className="flex h-[70vh] gap-4">
          <ul className="w-72 shrink-0 overflow-y-auto rounded-lg border border-gray-200 bg-white">
            {conversations.map((c) => {
              const active = c.id === activeId;
              return (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/mensajes?conv=${c.id}`}
                    className={`block border-b border-gray-100 px-3 py-2.5 ${active ? "bg-gray-100" : "hover:bg-gray-50"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-gray-900">
                        {c.name || c.phone || `#${c.id}`}
                      </span>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-gray-500">{c.lastMessage || "—"}</span>
                      {c.unread > 0 && (
                        <span className="shrink-0 rounded-full bg-green-600 px-1.5 text-[10px] text-white">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {activeConvo?.name || activeConvo?.phone || (activeId ? `#${activeId}` : "—")}
                </div>
                <div className="text-xs text-gray-400">{activeConvo?.phone}</div>
              </div>
              {activeConvo && (
                <div className="flex items-center gap-2">
                  <StatusBadge status={activeConvo.status} />
                  <HandoffButton conversationId={activeConvo.id} status={activeConvo.status} />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
              {notFound ? (
                <p className="m-auto text-sm text-gray-400">Conversación no encontrada.</p>
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
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
        open ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
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
      <div className="self-center rounded bg-gray-100 px-2 py-1 text-center text-[11px] text-gray-500">
        {m.content}
      </div>
    );
  }
  const isIn = m.direction === "in";
  const body =
    m.content || (m.attachments.length > 0 ? "🎤 audio / adjunto" : <span className="text-gray-400">(vacío)</span>);
  return (
    <div className={`flex flex-col ${isIn ? "items-start" : "items-end"}`}>
      {m.private && <span className="px-1 text-[10px] text-amber-600">nota interna</span>}
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
          m.private ? "bg-amber-50 text-gray-900" : isIn ? "bg-gray-100 text-gray-900" : "bg-green-100 text-gray-900"
        }`}
      >
        {body}
      </div>
      <span className="mt-0.5 px-1 text-[10px] text-gray-400">{fmtTime(m.createdAt)}</span>
    </div>
  );
}

function fmtTime(epochSec: number): string {
  if (!epochSec) return "";
  const d = new Date(epochSec * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
