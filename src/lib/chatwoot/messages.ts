import { chatwootFetch } from "./client";

// Chatwoot message_type: 0 incoming, 1 outgoing, 2 activity, 3 template.
type RawMessage = {
  id: number;
  content: string | null;
  message_type: number;
  created_at: number; // epoch seconds
  private?: boolean; // internal agent note
  sender?: { name?: string; type?: string };
  attachments?: { file_type?: string; data_url?: string }[];
};
type MessagesResponse = { payload?: RawMessage[]; data?: { payload?: RawMessage[] } };

export type ThreadDirection = "in" | "out" | "activity";

export type ThreadMessage = {
  id: number;
  direction: ThreadDirection;
  content: string;
  createdAt: number; // epoch seconds
  private: boolean;
  senderName: string | null;
  template: boolean;
  attachments: { type: string; url: string }[];
};

function directionOf(messageType: number): ThreadDirection {
  if (messageType === 0) return "in"; // from the WhatsApp client
  if (messageType === 1 || messageType === 3) return "out"; // agent/bot/template
  return "activity"; // 2 = system event
}

/**
 * Full message thread of ONE conversation, oldest first.
 * accountId MUST be the session negocio's account; passing a conversationId from another
 * account returns 404 from Chatwoot, which is the cross-tenant guard.
 */
export async function getThread(
  accountId: string | number,
  conversationId: number | string,
): Promise<ThreadMessage[]> {
  const data = await chatwootFetch<MessagesResponse>(
    `/accounts/${accountId}/conversations/${conversationId}/messages`,
  );
  const raw = data.data?.payload ?? data.payload ?? [];

  return mapThread(raw);
}

function mapThread(raw: RawMessage[]): ThreadMessage[] {
  return raw
    .map((m): ThreadMessage => ({
      id: m.id,
      direction: directionOf(m.message_type),
      content: (m.content ?? "").trim(),
      createdAt: m.created_at ?? 0,
      private: Boolean(m.private),
      senderName: m.sender?.name?.trim() || null,
      template: m.message_type === 3,
      attachments: (m.attachments ?? []).map((a) => ({
        type: a.file_type ?? "file",
        url: a.data_url ?? "",
      })),
    }))
    .sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Send an outgoing (agent) reply to a conversation. It reaches the customer's WhatsApp via
 * the inbox channel. accountId MUST be the session negocio's account — a conversationId from
 * another account returns 404 (the cross-tenant guard).
 *
 * Note on WhatsApp's 24h window: Chatwoot usually accepts the POST and the provider reports
 * delivery failure asynchronously (shown later in the thread). When Meta/Chatwoot DOES reject
 * synchronously, chatwootFetch throws a ChatwootError the caller maps to a friendly message.
 */
export async function sendReply(
  accountId: string | number,
  conversationId: number | string,
  content: string,
): Promise<{ id: number }> {
  const data = await chatwootFetch<{ id: number }>(
    `/accounts/${accountId}/conversations/${conversationId}/messages`,
    { method: "POST", body: JSON.stringify({ content, message_type: "outgoing" }) },
  );
  return { id: data.id };
}
