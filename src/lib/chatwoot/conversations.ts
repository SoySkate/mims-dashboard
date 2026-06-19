import { chatwootFetch } from "./client";

// Minimal shapes of the bits of the Chatwoot conversation payload we use.
type RawSender = { name?: string; phone_number?: string; identifier?: string };
type RawMessage = { content?: string | null; message_type?: number; created_at?: number };
type RawConversation = {
  id: number;
  inbox_id: number;
  status: string; // open | pending | resolved | snoozed
  unread_count?: number;
  last_activity_at?: number; // epoch seconds
  messages?: RawMessage[];
  meta?: { sender?: RawSender };
  custom_attributes?: Record<string, unknown>; // e.g. call cost/duration/agent set by n8n
};
type ConversationsResponse = { data?: { payload?: RawConversation[] }; payload?: RawConversation[] };

export type ConversationSummary = {
  id: number;
  status: string;
  name: string | null;
  phone: string | null;
  lastMessage: string;
  lastActivityAt: number; // epoch seconds
  unread: number;
  customAttributes: Record<string, unknown> | null; // null when absent (e.g. WhatsApp convos)
};

const ACTIVE_STATUSES = ["open", "pending"] as const;
// Call transcripts in the "Llamadas" inbox can be in any state (often resolved), so that
// screen passes the full set. Mensajes keeps the default (active only).
export const ALL_STATUSES = ["open", "pending", "resolved", "snoozed"] as const;

async function fetchByStatus(accountId: string | number, inboxId: number, status: string) {
  const data = await chatwootFetch<ConversationsResponse>(
    `/accounts/${accountId}/conversations?inbox_id=${inboxId}&status=${status}`,
  );
  // Chatwoot wraps the list in `data.payload`; be defensive about either shape.
  return data.data?.payload ?? data.payload ?? [];
}

/**
 * Active (open + pending) WhatsApp conversations for ONE account, newest first.
 * accountId/inboxId MUST come from the session's negocio — never the client.
 */
export async function listConversations(
  accountId: string | number,
  inboxId: number,
  statuses: readonly string[] = ACTIVE_STATUSES,
): Promise<ConversationSummary[]> {
  const batches = await Promise.all(statuses.map((s) => fetchByStatus(accountId, inboxId, s)));
  const raw = batches.flat();

  const summaries = raw.map((c): ConversationSummary => {
    const sender = c.meta?.sender;
    const last = c.messages?.[c.messages.length - 1];
    return {
      id: c.id,
      status: c.status,
      name: sender?.name?.trim() || null,
      phone: sender?.phone_number || null,
      lastMessage: (last?.content ?? "").trim(),
      lastActivityAt: c.last_activity_at ?? 0,
      unread: c.unread_count ?? 0,
      customAttributes:
        c.custom_attributes && Object.keys(c.custom_attributes).length > 0 ? c.custom_attributes : null,
    };
  });

  summaries.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  return summaries;
}

/**
 * Mark a conversation as read for the agent (resets Chatwoot's unread_count). Without this,
 * the dashboard reads messages but never tells Chatwoot "seen", so unread piles up.
 * accountId MUST be the session account (foreign conv → 404).
 */
export async function markConversationRead(
  accountId: string | number,
  conversationId: number | string,
): Promise<void> {
  await chatwootFetch(`/accounts/${accountId}/conversations/${conversationId}/update_last_seen`, {
    method: "POST",
  });
}

/**
 * Handoff: set a conversation's status explicitly via Chatwoot's toggle_status.
 * open = a human took over (the n8n bot stays quiet); pending = the bot answers again.
 * Same mechanism the n8n Motor uses. accountId MUST be the session account (foreign conv → 404).
 */
export async function setConversationStatus(
  accountId: string | number,
  conversationId: number | string,
  status: "open" | "pending" | "resolved",
): Promise<void> {
  await chatwootFetch(`/accounts/${accountId}/conversations/${conversationId}/toggle_status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}
