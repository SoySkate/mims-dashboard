-- Cache of the WhatsApp inbox id per negocio (auto-detected from the Chatwoot API,
-- stored here so we don't hit /inboxes on every request). negocio.chatwoot_account_id
-- already exists. NULL inbox = not yet detected / negocio not on Chatwoot.
ALTER TABLE "public"."negocios" ADD COLUMN IF NOT EXISTS "chatwoot_inbox_id" text;
