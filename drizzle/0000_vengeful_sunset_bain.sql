-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE SEQUENCE "public"."historial_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "agent_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"cliente_telefono" text NOT NULL,
	"cliente_nombre" text,
	"motivo" text NOT NULL,
	"resumen" text,
	"mensaje_cliente" text,
	"status" text DEFAULT 'pendiente',
	"enviado_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profesionales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"servicios" text[],
	"horario" jsonb,
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "servicios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"duracion_minutos" integer DEFAULT 30 NOT NULL,
	"precio" numeric(10, 2) DEFAULT '0' NOT NULL,
	"profesional" text,
	"categoria" text DEFAULT 'General',
	"descripcion" text,
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "negocios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	"tipo_vertical" text NOT NULL,
	"direccion" text,
	"phone_number_id" text NOT NULL,
	"dueno_telefono" text,
	"horario" jsonb,
	"max_dias_futuros" integer DEFAULT 14,
	"zona_horaria" text DEFAULT 'Europe/Madrid',
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"telefono_contacto" text,
	"email_contacto" text,
	"web" text,
	"instagram" text,
	"chatwoot_account_id" text,
	"agente_activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historial" (
	"id" bigint PRIMARY KEY DEFAULT nextval('historial_id_seq'::regclass) NOT NULL,
	"negocio_id" uuid NOT NULL,
	"cliente_telefono" text NOT NULL,
	"cliente_nombre" text,
	"role" text NOT NULL,
	"mensaje" text NOT NULL,
	"session_state" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "historial_role_check" CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text]))
);
--> statement-breakpoint
CREATE TABLE "reservas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"cliente_telefono" text,
	"cliente_nombre" text,
	"servicios_json" jsonb,
	"servicios_resumen" text,
	"duracion_minutos" integer,
	"precio_total" numeric(10, 2),
	"fecha" date NOT NULL,
	"hora_inicio" time NOT NULL,
	"hora_fin" time NOT NULL,
	"profesional" text,
	"estado" text DEFAULT 'pendiente_confirmacion_cliente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"profesional_id" uuid,
	CONSTRAINT "reservas_estado_check" CHECK (estado = ANY (ARRAY['pendiente_confirmacion_cliente'::text, 'confirmado'::text, 'cancelado'::text, 'descartado_cliente'::text]))
);
--> statement-breakpoint
CREATE TABLE "profesional_servicios" (
	"profesional_id" uuid NOT NULL,
	"servicio_id" uuid NOT NULL,
	CONSTRAINT "profesional_servicios_pkey" PRIMARY KEY("profesional_id","servicio_id")
);
--> statement-breakpoint
ALTER TABLE "profesionales" ADD CONSTRAINT "profesionales_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial" ADD CONSTRAINT "historial_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "public"."profesionales"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profesional_servicios" ADD CONSTRAINT "profesional_servicios_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "public"."profesionales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profesional_servicios" ADD CONSTRAINT "profesional_servicios_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_alerts_pendientes" ON "agent_alerts" USING btree ("negocio_id" timestamptz_ops,"cliente_telefono" timestamptz_ops,"status" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_profesionales_negocio" ON "profesionales" USING btree ("negocio_id" uuid_ops) WHERE (activo = true);--> statement-breakpoint
CREATE INDEX "idx_servicios_negocio" ON "servicios" USING btree ("negocio_id" uuid_ops) WHERE (activo = true);--> statement-breakpoint
CREATE INDEX "idx_negocios_phone_number_id" ON "negocios" USING btree ("phone_number_id" text_ops) WHERE (activo = true);--> statement-breakpoint
CREATE UNIQUE INDEX "negocios_phone_number_id_key" ON "negocios" USING btree ("phone_number_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "negocios_slug_key" ON "negocios" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE INDEX "idx_historial_cliente" ON "historial" USING btree ("negocio_id" timestamptz_ops,"cliente_telefono" timestamptz_ops,"created_at" text_ops);--> statement-breakpoint
CREATE INDEX "idx_reservas_negocio_fecha" ON "reservas" USING btree ("negocio_id" date_ops,"fecha" uuid_ops) WHERE (estado = ANY (ARRAY['confirmado'::text, 'pendiente_confirmacion_cliente'::text]));--> statement-breakpoint
CREATE INDEX "idx_reservas_profesional_fecha" ON "reservas" USING btree ("profesional_id" date_ops,"fecha" date_ops) WHERE (estado = ANY (ARRAY['confirmado'::text, 'pendiente_confirmacion_cliente'::text]));--> statement-breakpoint
CREATE INDEX "idx_reservas_telefono" ON "reservas" USING btree ("negocio_id" date_ops,"cliente_telefono" text_ops,"fecha" uuid_ops);
*/