-- Chatwoot inbox id of the separate "Llamadas" inbox per negocio (Retell call transcripts
-- are posted there by an external n8n flow). Analogous to chatwoot_inbox_id (WhatsApp).
-- NULL = negocio has no calls inbox -> "no configurado". Same account as WhatsApp
-- (negocios.chatwoot_account_id); only the inbox differs.
ALTER TABLE "public"."negocios" ADD COLUMN IF NOT EXISTS "chatwoot_inbox_id_llamadas" text;
