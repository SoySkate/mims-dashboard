-- Voice bot on/off per negocio. true = Telnyx voice bot active, false = disabled.
-- Real mims_app already has this column; IF NOT EXISTS makes it a safe no-op there.
ALTER TABLE "public"."negocios" ADD COLUMN IF NOT EXISTS "voz_activa" boolean DEFAULT true NOT NULL;
