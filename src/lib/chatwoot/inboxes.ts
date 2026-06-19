import { chatwootFetch, ChatwootError } from "./client";

type Inbox = {
  id: number;
  name: string;
  channel_type: string; // e.g. "Channel::Whatsapp", "Channel::WebWidget"
};

const WHATSAPP_CHANNEL = "Channel::Whatsapp";

/**
 * All inboxes for an account. Returns [] if the account/inbox resource is gone (404) —
 * a valid state (e.g. a WhatsApp number was released), not an error.
 */
export async function listInboxes(accountId: string | number): Promise<Inbox[]> {
  try {
    const data = await chatwootFetch<{ payload: Inbox[] }>(`/accounts/${accountId}/inboxes`);
    return data.payload ?? [];
  } catch (e) {
    if (e instanceof ChatwootError && e.status === 404) return [];
    throw e;
  }
}

/**
 * The WhatsApp inbox id for an account, or null if none (no WhatsApp inbox / 404).
 * If there are several WhatsApp inboxes we take the first; that's why
 * `negocios.chatwoot_inbox_id` exists as an override.
 */
export async function getWhatsappInboxId(accountId: string | number): Promise<number | null> {
  const inboxes = await listInboxes(accountId);
  const wa = inboxes.find((i) => i.channel_type === WHATSAPP_CHANNEL);
  return wa?.id ?? null;
}
