-- App-owned table: users (login). Does NOT exist in the mims_app schema.
-- One user belongs to exactly one negocio (tenant). Email/password login.
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "negocio_id" uuid NOT NULL,
    "email" text NOT NULL,
    "password_hash" text NOT NULL,
    "nombre" text,
    "role" text DEFAULT 'owner' NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'staff'::text]))),
    CONSTRAINT "users_negocio_id_fkey" FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE
);

-- Case-insensitive unique email: store/lookup lowercased in app code.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON public.users USING btree (lower(email));
CREATE INDEX IF NOT EXISTS idx_users_negocio ON public.users USING btree (negocio_id) WHERE (activo = true);

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
