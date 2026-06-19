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
};

const ACTIVE_STATUSES = ["open", "pending"] as const;

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
): Promise<ConversationSummary[]> {
  const batches = await Promise.all(ACTIVE_STATUSES.map((s) => fetchByStatus(accountId, inboxId, s)));
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
    };
  });

  summaries.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  return summaries;
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
