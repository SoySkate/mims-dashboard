-- mims_app dump (cleaned source for mims_dashboard_dev)
-- Extension C-functions (armor, crypt, gtrgm_*, unaccent, ...) removed:
-- they are provided by the pgcrypto / pg_trgm / unaccent extensions instead.
-- The only kept function is trigger_set_updated_at (plpgsql).

CREATE FUNCTION "trigger_set_updated_at" () RETURNS trigger LANGUAGE plpgsql AS '
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
';

DROP TABLE IF EXISTS "agent_alerts";
CREATE TABLE "public"."agent_alerts" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "negocio_id" uuid NOT NULL,
    "cliente_telefono" text NOT NULL,
    "cliente_nombre" text,
    "motivo" text NOT NULL,
    "resumen" text,
    "mensaje_cliente" text,
    "status" text DEFAULT 'pendiente',
    "enviado_en" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "agent_alerts_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

CREATE INDEX idx_alerts_pendientes ON public.agent_alerts USING btree (negocio_id, cliente_telefono, status, created_at DESC);

INSERT INTO "agent_alerts" ("id", "negocio_id", "cliente_telefono", "cliente_nombre", "motivo", "resumen", "mensaje_cliente", "status", "enviado_en", "created_at") VALUES
('e4baaebf-a6fd-4e3d-aeec-ed57f87c8a99',    '11111111-1111-1111-1111-111111111111',    '34681134086',    'Franc',    'queja',    'El cliente esta frustrado y usa lenguaje ofensivo.',    'Me entiendes o que?',    'enviado',    '2026-05-30 18:37:09.381089+00',    '2026-05-30 18:37:08.395323+00'),
('bab1a540-27d3-40ff-bb03-a4f96b33f582',    '11111111-1111-1111-1111-111111111111',    '34654101013',    'aNoNyMoUs',    'fuera_scope',    'El cliente expresa dolor de espalda, fuera del alcance del asistente.',    'me duele la espalda',    'enviado',    '2026-05-30 18:42:50.231646+00',    '2026-05-30 18:42:48.928404+00');
-- NOTE: agent_alerts has NO foreign key in the source dump (it can reference negocio ids
-- not present in negocios), so it is intentionally kept FK-free here too.

DROP TABLE IF EXISTS "negocios";
CREATE TABLE "public"."negocios" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "slug" text NOT NULL,
    "nombre" text NOT NULL,
    "tipo_vertical" text NOT NULL,
    "direccion" text,
    "phone_number_id" text NOT NULL,
    "dueno_telefono" text,
    "horario" jsonb,
    "max_dias_futuros" integer DEFAULT '14',
    "zona_horaria" text DEFAULT 'Europe/Madrid',
    "activo" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "telefono_contacto" text,
    "email_contacto" text,
    "web" text,
    "instagram" text,
    "chatwoot_account_id" text,
    "chatwoot_inbox_id" text,
    "chatwoot_inbox_id_llamadas" text,
    "voz_activa" boolean DEFAULT true NOT NULL,
    "agente_activo" boolean DEFAULT true NOT NULL,
    CONSTRAINT "negocios_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

CREATE UNIQUE INDEX negocios_slug_key ON public.negocios USING btree (slug);
CREATE UNIQUE INDEX negocios_phone_number_id_key ON public.negocios USING btree (phone_number_id);
CREATE INDEX idx_negocios_phone_number_id ON public.negocios USING btree (phone_number_id) WHERE (activo = true);

INSERT INTO "negocios" ("id", "slug", "nombre", "tipo_vertical", "direccion", "phone_number_id", "dueno_telefono", "horario", "max_dias_futuros", "zona_horaria", "activo", "created_at", "updated_at", "telefono_contacto", "email_contacto", "web", "instagram", "chatwoot_account_id", "agente_activo") VALUES
('b4ac5f7a-e99a-4db8-8336-aef5ea4bfbf5',    'peluqueria-canina',    'Peluqueria Canina Demo',    'peluqueria_canina',    'Plaza montepinar 13',    'pelu_canina_id_phone_number',    '34000000000',    '{"dom": "cerrado", "jue": "9-14,16-19", "lun": "cerrado", "mar": "9-14,16-19", "mie": "9-14,16-19", "sab": "9-14", "vie": "9-14,16-19"}',    14,    'Europe/Madrid',    true,    '2026-06-01 14:58:17.051047+00',    '2026-06-02 19:49:39.937946+00',    NULL,    NULL,    NULL,    NULL,    NULL,    true),
('11111111-1111-1111-1111-111111111111',    'centre-medic-puigcerda',    'Centre Medic Puigcerda',    'reservas_medico',    'C/ Pla del Fort 7, Puigcerda',    '1122121221221',    '34680349420',    '{"dom": "cerrado", "jue": "9-13,15-19", "lun": "9-13,15-19", "mar": "9-13,15-19", "mie": "9-13,15-19", "sab": "cerrado", "vie": "9-13,15-19"}',    21,    'Europe/Madrid',    true,    '2026-05-29 14:52:06.952116+00',    '2026-06-12 15:24:42.541452+00',    NULL,    NULL,    NULL,    NULL,    NULL,    true),
('22222222-2222-2222-2222-222222222222',    'clinica-dentos',    'Clinica Dentos',    'reservas_dental',    'C/ Cadi 1, Puigcerda',    '1055509577653724',    '34638328570',    '{"dom": "cerrado", "jue": "9-13,15-19", "lun": "9-13,15-19", "mar": "9-13,15-19", "mie": "9-13,15-19", "sab": "cerrado", "vie": "9-13,15-19"}',    21,    'Europe/Madrid',    true,    '2026-05-29 14:52:06.961147+00',    '2026-06-12 15:24:54.714404+00',    NULL,    NULL,    NULL,    NULL,    '6',    true),
('56e54cd5-8ebd-4a0f-9844-c1134082f77f',    'centre-de-psicologia-baobab',    'Centre de Psicologia Baobab',    'psicologo',    'Carrer Miquel Bernades, 21. Puigcerda',    '4444444444',    '34680349420',    '{"dom": "cerrado", "jue": "9-14,16-20", "lun": "9-14,16-20", "mar": "9-14,16-20", "mie": "9-14,16-20", "sab": "cerrado", "vie": "9-14"}',    14,    'Europe/Madrid',    true,    '2026-06-01 23:52:35.882108+00',    '2026-06-12 15:25:54.89005+00',    NULL,    NULL,    NULL,    NULL,    '5',    true),
('8d0ce837-82a2-4d0f-bf55-95d581d7d680',    'la-tasqueta-llivia',    'La Tasqueta',    'restaurante',    'Travessera dels Forns, 7 17527 Llivia, Girona',    '1171203299412085',    '34681134086',    '{"dom": "13-16", "jue": "cerrado", "lun": "cerrado", "mar": "cerrado", "mie": "cerrado", "sab": "13-16,20-23", "vie": "13-16,20-23"}',    14,    'Europe/Madrid',    true,    '2026-06-12 00:21:36.129314+00',    '2026-06-13 07:58:45.448434+00',    NULL,    NULL,    NULL,    NULL,    '7',    true);

DROP TABLE IF EXISTS "servicios";
CREATE TABLE "public"."servicios" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "negocio_id" uuid NOT NULL,
    "nombre" text NOT NULL,
    "duracion_minutos" integer DEFAULT '30' NOT NULL,
    "precio" numeric(10,2) DEFAULT '0' NOT NULL,
    "profesional" text,
    "categoria" text DEFAULT 'General',
    "descripcion" text,
    "activo" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "servicios_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

CREATE INDEX idx_servicios_negocio ON public.servicios USING btree (negocio_id) WHERE (activo = true);

INSERT INTO "servicios" ("id", "negocio_id", "nombre", "duracion_minutos", "precio", "profesional", "categoria", "descripcion", "activo", "created_at") VALUES
('ff572c13-e6a8-411c-925e-505f9c321214',    '22222222-2222-2222-2222-222222222222',    'Primera visita y diagnostico',    30,    0.00,    'Dra. Francesca Llos',    'Consulta',    'Revision inicial y presupuesto, gratuita',    true,    '2026-05-29 14:52:06.963126+00'),
('4557f28b-9e67-4611-aa24-4a050a95d8a6',    '22222222-2222-2222-2222-222222222222',    'Limpieza dental',    40,    55.00,    'Dra. Andrea Galve',    'Higiene',    'Limpieza y profilaxis',    true,    '2026-05-29 14:52:06.963126+00'),
('a3d186f2-d08e-4c0c-bbea-940633a2cb37',    '22222222-2222-2222-2222-222222222222',    'Empaste',    45,    70.00,    'Dra. Francesca Llos',    'Conservadora',    'Obturacion de caries',    true,    '2026-05-29 14:52:06.963126+00'),
('7ba31f89-5a77-42c2-a03a-9d5f27143463',    '22222222-2222-2222-2222-222222222222',    'Blanqueamiento dental',    60,    250.00,    'Dra. Andrea Galve',    'Estetica',    'Blanqueamiento en clinica',    true,    '2026-05-29 14:52:06.963126+00'),
('746d02cf-b04a-4be6-92d2-dd2427ffc540',    '11111111-1111-1111-1111-111111111111',    'Visita medicina general',    20,    50.00,    'Dr. Pere Roure',    'Medicina general',    'Consulta con medico de familia',    true,    '2026-05-29 14:52:06.956264+00'),
('7638f558-66bc-4072-bb2c-a465d6d50217',    '11111111-1111-1111-1111-111111111111',    'Visita fisioterapia',    45,    45.00,    'Oriol Moner',    'Fisioterapia',    'Sesion de rehabilitacion',    true,    '2026-05-29 14:52:06.956264+00'),
('f5cee59f-e8cd-4179-8a41-930c05fe8d09',    '11111111-1111-1111-1111-111111111111',    'Visita psicologia',    30,    70.00,    'Goretti Sola',    'Dermatologia',    'Consulta dermatologica',    true,    '2026-05-29 14:52:06.956264+00'),
('38ed4d97-e8c9-4791-a616-613161553816',    '11111111-1111-1111-1111-111111111111',    'Visita osteopatia',    30,    75.00,    'Sara Muntane',    'Ginecologia',    'Visita ginecologica con revision',    true,    '2026-05-29 14:52:06.956264+00'),
('4448b9d9-ba92-4080-828f-ae06b66b9ed4',    'b4ac5f7a-e99a-4db8-8336-aef5ea4bfbf5',    'Bano e hidratacion',    60,    25.00,    'Equipo de peluqueria',    'General',    'Bano con champu adaptado e hidratacion',    true,    '2026-06-01 15:05:34.589378+00'),
('d2d6ba91-8b8c-4fc4-9d33-4bb8b66ac137',    'b4ac5f7a-e99a-4db8-8336-aef5ea4bfbf5',    'Corte y arreglo',    75,    30.00,    'Equipo de peluqueria',    'General',    'Corte de pelo y arreglo segun raza',    true,    '2026-06-01 15:05:34.589378+00'),
('2469c920-43d2-4281-83fb-b6615bdca57f',    'b4ac5f7a-e99a-4db8-8336-aef5ea4bfbf5',    'Bano y corte completo',    90,    45.00,    'Equipo de peluqueria',    'General',    'Bano completo mas corte y acabado',    true,    '2026-06-01 15:05:34.589378+00'),
('e7a95dd3-96c5-4ab1-bd33-3db6de806d55',    'b4ac5f7a-e99a-4db8-8336-aef5ea4bfbf5',    'Deslanado',    60,    35.00,    'Equipo de peluqueria',    'General',    'Eliminacion de subpelo y muda',    true,    '2026-06-01 15:05:34.589378+00'),
('74a39505-a2cc-4bdb-ac74-fa0d395768b0',    'b4ac5f7a-e99a-4db8-8336-aef5ea4bfbf5',    'Corte de unas',    15,    8.00,    'Equipo de peluqueria',    'General',    'Corte y limado de unas',    true,    '2026-06-01 15:05:34.589378+00'),
('3e62810d-c3fc-4ef8-b2c0-6a845bf36367',    '56e54cd5-8ebd-4a0f-9844-c1134082f77f',    'Primera sesion / valoracion',    60,    60.00,    'Laia Reales Lopez',    'General',    NULL,    true,    '2026-06-01 23:53:33.730888+00'),
('5a919218-69e0-4ef6-9062-fd41f3497a9e',    '56e54cd5-8ebd-4a0f-9844-c1134082f77f',    'Sesion individual',    50,    50.00,    'Laia Reales Lopez',    'General',    NULL,    true,    '2026-06-01 23:53:33.730888+00'),
('cde398b6-882a-417c-9d6a-8e7236364201',    '56e54cd5-8ebd-4a0f-9844-c1134082f77f',    'Terapia de pareja',    60,    70.00,    'Laia Reales Lopez',    'General',    NULL,    true,    '2026-06-01 23:53:33.730888+00'),
('7cb4278d-3e2a-4630-8f3a-47c1fc3b8929',    '56e54cd5-8ebd-4a0f-9844-c1134082f77f',    'Sesion online',    50,    45.00,    'Laia Reales Lopez',    'General',    NULL,    true,    '2026-06-01 23:53:33.730888+00'),
('166085e3-96d1-421d-9d70-43028cf06f3c',    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    'Mesa para 2',    90,    0.00,    NULL,    'General',    NULL,    true,    '2026-06-12 00:23:39.446769+00'),
('268ae8e9-f9b1-42fb-8516-582e18a85a79',    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    'Mesa para 4',    90,    0.00,    NULL,    'General',    NULL,    true,    '2026-06-12 00:23:39.446769+00'),
('b602bf87-e3cf-4b00-91d6-8a0f23735020',    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    'Mesa para 6',    90,    0.00,    NULL,    'General',    NULL,    true,    '2026-06-12 00:23:39.446769+00'),
('467a1064-9b47-4a66-898f-a81c05a0a193',    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    'Mesa para 8',    120,    0.00,    NULL,    'General',    NULL,    true,    '2026-06-12 00:23:39.446769+00');

DROP TABLE IF EXISTS "profesionales";
CREATE TABLE "public"."profesionales" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "negocio_id" uuid NOT NULL,
    "nombre" text NOT NULL,
    "servicios" text[],
    "horario" jsonb,
    "activo" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "profesionales_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

CREATE INDEX idx_profesionales_negocio ON public.profesionales USING btree (negocio_id) WHERE (activo = true);

INSERT INTO "profesionales" ("id", "negocio_id", "nombre", "servicios", "horario", "activo", "created_at") VALUES
('5c8950f0-01e7-42ee-9fb3-6640449c0f62',    '11111111-1111-1111-1111-111111111111',    'Dra. Sonia Esquerrer',    '{"Visita medicina general"}',    '{"jue": "9-13,15-19", "lun": "9-13,15-19", "mar": "9-13,15-19", "mie": "9-13,15-19", "vie": "9-13,15-19"}',    true,    '2026-05-29 15:44:31.003246+00'),
('db0165e1-67f5-4734-b0c6-16f5ffa809d6',    '11111111-1111-1111-1111-111111111111',    'Equipo de fisioterapia',    '{"Visita fisioterapia"}',    '{"jue": "9-13,15-19", "lun": "9-13,15-19", "mar": "9-13,15-19", "mie": "9-13,15-19", "vie": "9-13,15-19"}',    true,    '2026-05-29 15:44:31.003246+00'),
('aa8d1d62-d92d-41ed-9d17-269c11c7cd10',    '11111111-1111-1111-1111-111111111111',    'Dr. Dermatologia',    '{"Visita dermatologia"}',    '{"jue": "15-19", "mar": "15-19"}',    true,    '2026-05-29 15:44:31.003246+00'),
('a98efa4d-c02c-415d-93c6-67614bed0316',    '11111111-1111-1111-1111-111111111111',    'Dra. Ginecologia',    '{"Revision ginecologica"}',    '{"lun": "9-13", "mie": "9-13"}',    true,    '2026-05-29 15:44:31.003246+00'),
('bfab15f6-5b5e-42a8-a3c3-23b129d57d0a',    '22222222-2222-2222-2222-222222222222',    'Dra. Andrea Galve',    '{"Limpieza dental","Blanqueamiento dental"}',    '{"jue": "9-13,15-19", "lun": "9-13,15-19", "mar": "9-13,15-19", "mie": "9-13,15-19", "vie": "9-13,15-19"}',    true,    '2026-05-29 15:44:31.009828+00'),
('3ae620ac-0d9e-46b1-a83a-4f3ba9848e56',    '22222222-2222-2222-2222-222222222222',    'Dra. Francesca Llos',    '{"Primera visita y diagnostico",Empaste}',    '{"jue": "9-13,15-19", "lun": "9-13,15-19", "mar": "9-13,15-19", "mie": "9-13,15-19", "vie": "9-13,15-19"}',    true,    '2026-05-29 15:44:31.009828+00'),
('61d69b58-3ebb-424b-afca-5215b88e5476',    'b4ac5f7a-e99a-4db8-8336-aef5ea4bfbf5',    'Laia Pou',    '{"Bano e hidratacion","Bano y corte completo"}',    '{"dom": "cerrado", "jue": "9-14,16-19", "lun": "cerrado", "mar": "9-14,16-19", "mie": "9-14,16-19", "sab": "9-14", "vie": "9-14,16-19"}',    true,    '2026-06-01 19:16:20.73379+00'),
('9565ce69-44ba-4d21-b05b-694c1afc2cf2',    'b4ac5f7a-e99a-4db8-8336-aef5ea4bfbf5',    'Marc Ferrer',    '{"Corte y arreglo",Deslanado}',    '{"dom": "cerrado", "jue": "9-14", "lun": "cerrado", "mar": "9-14,16-19", "mie": "9-14,16-19", "sab": "9-14", "vie": "9-14,16-19"}',    true,    '2026-06-01 19:16:20.73379+00'),
('dda39e8a-8b8e-43f0-9c57-1f0ccf9107bc',    'b4ac5f7a-e99a-4db8-8336-aef5ea4bfbf5',    'Nuria Bosch',    '{"Corte de unas","Bano e hidratacion","Corte y arreglo"}',    '{"dom": "cerrado", "jue": "9-14,16-19", "lun": "cerrado", "mar": "9-14,16-19", "mie": "9-14,16-19", "sab": "cerrado", "vie": "9-14,16-19"}',    true,    '2026-06-01 19:16:20.73379+00'),
('bb6fb71a-d56d-4aea-a66d-f255635654d3',    '56e54cd5-8ebd-4a0f-9844-c1134082f77f',    'Laia Reales Lopez',    '{"Primera sesion / valoracion","Sesion individual","Terapia de pareja","Sesion online"}',    '{"dom": "cerrado", "jue": "9-14,16-20", "lun": "9-14,16-20", "mar": "9-14,16-20", "mie": "9-14,16-20", "sab": "cerrado", "vie": "9-14"}',    true,    '2026-06-02 00:10:26.651898+00');

DROP TABLE IF EXISTS "profesional_servicios";
CREATE TABLE "public"."profesional_servicios" (
    "profesional_id" uuid NOT NULL,
    "servicio_id" uuid NOT NULL,
    CONSTRAINT "profesional_servicios_pkey" PRIMARY KEY ("profesional_id", "servicio_id")
)
WITH (oids = false);

INSERT INTO "profesional_servicios" ("profesional_id", "servicio_id") VALUES
('dda39e8a-8b8e-43f0-9c57-1f0ccf9107bc',    '4448b9d9-ba92-4080-828f-ae06b66b9ed4'),
('3ae620ac-0d9e-46b1-a83a-4f3ba9848e56',    'a3d186f2-d08e-4c0c-bbea-940633a2cb37'),
('9565ce69-44ba-4d21-b05b-694c1afc2cf2',    'e7a95dd3-96c5-4ab1-bd33-3db6de806d55'),
('bb6fb71a-d56d-4aea-a66d-f255635654d3',    '3e62810d-c3fc-4ef8-b2c0-6a845bf36367'),
('3ae620ac-0d9e-46b1-a83a-4f3ba9848e56',    'ff572c13-e6a8-411c-925e-505f9c321214'),
('db0165e1-67f5-4734-b0c6-16f5ffa809d6',    '7638f558-66bc-4072-bb2c-a465d6d50217'),
('9565ce69-44ba-4d21-b05b-694c1afc2cf2',    'd2d6ba91-8b8c-4fc4-9d33-4bb8b66ac137'),
('bfab15f6-5b5e-42a8-a3c3-23b129d57d0a',    '4557f28b-9e67-4611-aa24-4a050a95d8a6'),
('5c8950f0-01e7-42ee-9fb3-6640449c0f62',    '746d02cf-b04a-4be6-92d2-dd2427ffc540'),
('bb6fb71a-d56d-4aea-a66d-f255635654d3',    '5a919218-69e0-4ef6-9062-fd41f3497a9e'),
('bb6fb71a-d56d-4aea-a66d-f255635654d3',    'cde398b6-882a-417c-9d6a-8e7236364201'),
('bb6fb71a-d56d-4aea-a66d-f255635654d3',    '7cb4278d-3e2a-4630-8f3a-47c1fc3b8929'),
('61d69b58-3ebb-424b-afca-5215b88e5476',    '2469c920-43d2-4281-83fb-b6615bdca57f'),
('61d69b58-3ebb-424b-afca-5215b88e5476',    '4448b9d9-ba92-4080-828f-ae06b66b9ed4'),
('dda39e8a-8b8e-43f0-9c57-1f0ccf9107bc',    '74a39505-a2cc-4bdb-ac74-fa0d395768b0'),
('dda39e8a-8b8e-43f0-9c57-1f0ccf9107bc',    'd2d6ba91-8b8c-4fc4-9d33-4bb8b66ac137'),
('bfab15f6-5b5e-42a8-a3c3-23b129d57d0a',    '7ba31f89-5a77-42c2-a03a-9d5f27143463');

DROP TABLE IF EXISTS "reservas";
CREATE TABLE "public"."reservas" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "negocio_id" uuid NOT NULL,
    "cliente_telefono" text,
    "cliente_nombre" text,
    "servicios_json" jsonb,
    "servicios_resumen" text,
    "duracion_minutos" integer,
    "precio_total" numeric(10,2),
    "fecha" date NOT NULL,
    "hora_inicio" time without time zone NOT NULL,
    "hora_fin" time without time zone NOT NULL,
    "profesional" text,
    "estado" text DEFAULT 'pendiente_confirmacion_cliente' NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "profesional_id" uuid,
    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reservas_estado_check" CHECK (((estado = ANY (ARRAY['pendiente_confirmacion_cliente'::text, 'confirmado'::text, 'cancelado'::text, 'descartado_cliente'::text]))))
)
WITH (oids = false);

CREATE INDEX idx_reservas_negocio_fecha ON public.reservas USING btree (negocio_id, fecha) WHERE (estado = ANY (ARRAY['confirmado'::text, 'pendiente_confirmacion_cliente'::text]));
CREATE INDEX idx_reservas_telefono ON public.reservas USING btree (negocio_id, cliente_telefono, fecha DESC);
CREATE INDEX idx_reservas_profesional_fecha ON public.reservas USING btree (profesional_id, fecha) WHERE (estado = ANY (ARRAY['confirmado'::text, 'pendiente_confirmacion_cliente'::text]));

INSERT INTO "reservas" ("id", "negocio_id", "cliente_telefono", "cliente_nombre", "servicios_json", "servicios_resumen", "duracion_minutos", "precio_total", "fecha", "hora_inicio", "hora_fin", "profesional", "estado", "created_at", "updated_at", "profesional_id") VALUES
('35138b97-9bd9-4ac5-83f6-fdf5575b7d73',    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    '34654101013',    'Lauri',    NULL,    'Mesa para 4',    90,    0.00,    '2026-06-19',    '13:00:00',    '14:30:00',    NULL,    'confirmado',    '2026-06-13 08:28:53.886085+00',    '2026-06-13 08:28:53.886085+00',    NULL),
('ec1045dd-9db9-4e99-9ce7-dc5f2d721cb0',    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    NULL,    'Ramon',    NULL,    'Mesa para 6',    90,    0.00,    '2026-06-13',    '22:00:00',    '23:30:00',    NULL,    'cancelado',    '2026-06-13 08:08:46.058047+00',    '2026-06-13 09:08:11.876566+00',    NULL),
('4dea1fec-a619-4685-92fa-a87cc3ed511c',    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    '34654101013',    'Victor wmby',    NULL,    'Mesa para 2',    90,    0.00,    '2026-06-20',    '21:00:00',    '22:30:00',    NULL,    'cancelado',    '2026-06-13 09:06:58.430242+00',    '2026-06-13 09:14:33.226996+00',    NULL),
('39d3c6e0-f118-497e-b5e2-0681f8168ec6',    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    '34600000001',    'Marta Soler',    NULL,    'Mesa para 4',    90,    0.00,    '2026-06-13',    '13:30:00',    '15:00:00',    NULL,    'confirmado',    '2026-06-12 00:23:51.820641+00',    '2026-06-12 00:23:51.820641+00',    NULL),
('cf36a045-f27d-434e-8250-89100aeac6ad',    '11111111-1111-1111-1111-111111111111',    '34655550106',    'Marc Serra',    NULL,    'Visita medicina general',    20,    50.00,    '2026-06-01',    '17:00:00',    '17:20:00',    'Dr. Pere Roure',    'confirmado',    '2026-05-31 20:31:18.009392+00',    '2026-05-31 20:31:18.009392+00',    NULL),
('da7e22ac-b138-483d-9051-593f1c4c317a',    '11111111-1111-1111-1111-111111111111',    '34655550201',    'Roser Mas',    NULL,    'Visita psicologia',    30,    70.00,    '2026-06-02',    '16:00:00',    '16:30:00',    'Goretti Sola',    'confirmado',    '2026-05-31 20:31:18.009392+00',    '2026-05-31 20:31:18.009392+00',    NULL),
('6b97e5b1-3c4a-484b-a18f-0bc30624238c',    '11111111-1111-1111-1111-111111111111',    '34655550202',    'Oriol Bosch',    NULL,    'Visita osteopatia',    30,    75.00,    '2026-06-02',    '17:00:00',    '17:30:00',    'Sara Muntane',    'confirmado',    '2026-05-31 20:31:18.009392+00',    '2026-05-31 20:31:18.009392+00',    NULL),
('5d56250d-3d29-432d-97d2-798bd8fbb868',    '22222222-2222-2222-2222-222222222222',    '34655550105',    'Anna Roca',    NULL,    'Limpieza dental',    40,    55.00,    '2026-06-01',    '16:00:00',    '16:40:00',    'Dra. Andrea Galve',    'confirmado',    '2026-06-01 10:36:35.761364+00',    '2026-06-01 10:36:35.761364+00',    NULL),
('950b817b-ba8b-46fe-9359-163cdb361501',    '22222222-2222-2222-2222-222222222222',    '34655550201',    'Roser Mas',    NULL,    'Primera visita y diagnostico',    30,    0.00,    '2026-06-02',    '16:00:00',    '16:30:00',    'Dra. Francesca Llos',    'confirmado',    '2026-06-01 10:36:35.761364+00',    '2026-06-01 10:36:35.761364+00',    NULL),
('349515be-b675-4a5f-82cb-c169f3af6e6b',    '56e54cd5-8ebd-4a0f-9844-c1134082f77f',    '34654101013',    'Kibalion Hermes 3',    NULL,    'Terapia de pareja',    60,    70.00,    '2026-06-23',    '19:00:00',    '20:00:00',    'Laia Reales Lopez',    'confirmado',    '2026-06-08 21:26:16.710252+00',    '2026-06-09 13:30:58.00827+00',    NULL),
('80854b33-d468-4fb5-ba8d-760ecd758732',    '56e54cd5-8ebd-4a0f-9844-c1134082f77f',    '34654101013',    'JUANSEBASTIAN',    NULL,    'Primera sesion / valoracion',    60,    60.00,    '2026-06-10',    '10:30:00',    '11:30:00',    'Laia Reales Lopez',    'confirmado',    '2026-06-03 12:13:25.323292+00',    '2026-06-03 12:13:25.323292+00',    NULL),
('9a765dfd-3178-4954-8734-122574cc9af1',    '56e54cd5-8ebd-4a0f-9844-c1134082f77f',    '34654101013',    'drew drew',    NULL,    'Sesion online',    50,    45.00,    '2026-06-12',    '09:00:00',    '09:50:00',    'Laia Reales Lopez',    'confirmado',    '2026-06-08 16:28:32.966065+00',    '2026-06-08 16:28:32.966065+00',    NULL),
('bb22d68c-80cb-452b-b3f1-1b69778a0eed',    '56e54cd5-8ebd-4a0f-9844-c1134082f77f',    '34654101013',    'Joan Meno',    NULL,    'Sesion online',    50,    45.00,    '2026-06-12',    '11:00:00',    '11:50:00',    'Laia Reales Lopez',    'confirmado',    '2026-06-08 18:32:28.341668+00',    '2026-06-08 18:32:28.341668+00',    NULL),
('c254daff-d63a-487c-a27f-92df63b22ffd',    '56e54cd5-8ebd-4a0f-9844-c1134082f77f',    '34654101013',    'Helena Bondia',    NULL,    'Primera sesion / valoracion',    60,    60.00,    '2026-06-10',    '09:30:00',    '10:30:00',    'Laia Reales Lopez',    'cancelado',    '2026-06-03 00:13:29.234928+00',    '2026-06-08 21:27:41.049389+00',    NULL),
('3529827a-172f-4317-8034-78bd3eebd5a4',    '56e54cd5-8ebd-4a0f-9844-c1134082f77f',    '34654101013',    'Evaristo Rey de la Varaja',    NULL,    'Primera sesion / valoracion',    60,    60.00,    '2026-06-29',    '16:00:00',    '17:00:00',    'Laia Reales Lopez',    'confirmado',    '2026-06-08 21:47:24.304521+00',    '2026-06-09 13:08:06.945962+00',    NULL),
('8d72356e-be68-4fc7-b3b5-e033186f52da',    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    '34000000000',    'Andreu Martin',    NULL,    'Mesa para 4',    90,    0.00,    '2026-06-14',    '14:30:00',    '16:00:00',    NULL,    'confirmado',    '2026-06-13 09:11:15.927571+00',    '2026-06-13 09:11:15.927571+00',    NULL);

DROP TABLE IF EXISTS "historial";
DROP SEQUENCE IF EXISTS "public".historial_id_seq;
CREATE SEQUENCE "public".historial_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;

CREATE TABLE "public"."historial" (
    "id" bigint DEFAULT nextval('historial_id_seq') NOT NULL,
    "negocio_id" uuid NOT NULL,
    "cliente_telefono" text NOT NULL,
    "cliente_nombre" text,
    "role" text NOT NULL,
    "mensaje" text NOT NULL,
    "session_state" jsonb,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "historial_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "historial_role_check" CHECK (((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text]))))
)
WITH (oids = false);

CREATE INDEX idx_historial_cliente ON public.historial USING btree (negocio_id, cliente_telefono, created_at DESC);

-- Representative sample of the historial conversation log (full table in mims_app).
-- Two businesses present: Clinica Dentos (2222...) and La Tasqueta (8d0c...).
INSERT INTO "historial" ("id", "negocio_id", "cliente_telefono", "cliente_nombre", "role", "mensaje", "session_state", "created_at") VALUES
(2645,    '22222222-2222-2222-2222-222222222222',    '34680349420',    'MIMS EMPRESARIO',    'user',    'Hola',    NULL,    '2026-06-12 08:53:18.65763+00'),
(2646,    '22222222-2222-2222-2222-222222222222',    '34680349420',    'MIMS EMPRESARIO',    'assistant',    'Hola, dime que necesitas.',    NULL,    '2026-06-12 08:53:18.65763+00'),
(2649,    '22222222-2222-2222-2222-222222222222',    '34681134086',    'Franc',    'user',    'Hola quinsoc jo',    NULL,    '2026-06-12 09:03:12.418117+00'),
(2650,    '22222222-2222-2222-2222-222222222222',    '34681134086',    'Franc',    'assistant',    'Hola! Soc el teu assistent de la Clinica Dentos per gestionar lagenda. En que puc ajudar-te?',    NULL,    '2026-06-12 09:03:12.418117+00'),
(2667,    '22222222-2222-2222-2222-222222222222',    '34654101013',    'aNoNyMoUs',    'user',    'Hola',    NULL,    '2026-06-12 15:18:02.364296+00'),
(2668,    '22222222-2222-2222-2222-222222222222',    '34654101013',    'aNoNyMoUs',    'assistant',    'Hola! Soy tu asistente virtual de Clinica Dentos. En que puedo ayudarte hoy?',    NULL,    '2026-06-12 15:18:02.364296+00'),
(2726,    '22222222-2222-2222-2222-222222222222',    '34681134086',    'Franc',    'assistant',    'Cita confirmada. Primera visita y diagnostico. Viernes 19/06 10:00h. Dra. Francesca Llos. 0 euros.',    NULL,    '2026-06-12 15:32:11.457026+00'),
(2777,    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    '34654101013',    'aNoNyMoUs',    'user',    'Ola',    NULL,    '2026-06-12 16:38:55.584737+00'),
(2778,    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    '34654101013',    'aNoNyMoUs',    'assistant',    'Hola, bienvenido a La Tasqueta. Que deseas?',    NULL,    '2026-06-12 16:38:55.584737+00'),
(2811,    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    '34610585387',    'Marc Altes Vila',    'user',    'Hola',    NULL,    '2026-06-12 17:40:02.261322+00'),
(2812,    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    '34610585387',    'Marc Altes Vila',    'assistant',    'Hola! Soy el asistente virtual de La Tasqueta. En que puedo ayudarte con tu reserva?',    NULL,    '2026-06-12 17:40:02.261322+00'),
(2824,    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    '34610585387',    'Marc Altes Vila',    'assistant',    'Confirmado! Mesa para 4. Sabado 13/06 20:30h.',    NULL,    '2026-06-12 17:41:50.722479+00'),
(2941,    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    '34681134086',    'Franc',    'user',    'Dime que tengo hoy en la agenda',    NULL,    '2026-06-13 08:06:25.648805+00'),
(2942,    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    '34681134086',    'Franc',    'assistant',    'Aqui tienes la agenda de hoy. Sabado 13/06: 13:30h Mesa para 4 Marta Soler, 13:30h Mesa para 2 Jordi Pla, 14:00h Mesa para 6 Familia Rovira, 21:00h Mesa para 4 Laura Vidal, 21:00h Mesa para 2 Pere Camps.',    NULL,    '2026-06-13 08:06:25.648805+00'),
(2975,    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    '34681134086',    'Franc',    'user',    'Elimina la reserva de juanita porfavor',    NULL,    '2026-06-13 08:30:03.238397+00'),
(2976,    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    '34681134086',    'Franc',    'assistant',    'Ok, quieres que la elimine? Confirmame.',    NULL,    '2026-06-13 08:30:03.238397+00'),
(3057,    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    '34664476468',    'AdrianVP',    'user',    'hola quiero comer sushi',    NULL,    '2026-06-17 19:40:04.059284+00'),
(3058,    '8d0ce837-82a2-4d0f-bf55-95d581d7d680',    '34664476468',    'AdrianVP',    'assistant',    'Hola! Soy el asistente virtual de La Tasqueta. Aqui ofrecemos cocina catalana de montana, no sushi.',    NULL,    '2026-06-17 19:40:04.059284+00');
SELECT setval('historial_id_seq', (SELECT max(id) FROM historial));

ALTER TABLE ONLY "public"."historial" ADD CONSTRAINT "historial_negocio_id_fkey" FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."profesional_servicios" ADD CONSTRAINT "profesional_servicios_profesional_id_fkey" FOREIGN KEY (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."profesional_servicios" ADD CONSTRAINT "profesional_servicios_servicio_id_fkey" FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."profesionales" ADD CONSTRAINT "profesionales_negocio_id_fkey" FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."reservas" ADD CONSTRAINT "reservas_negocio_id_fkey" FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."reservas" ADD CONSTRAINT "reservas_profesional_id_fkey" FOREIGN KEY (profesional_id) REFERENCES profesionales(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."servicios" ADD CONSTRAINT "servicios_negocio_id_fkey" FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;

CREATE TRIGGER "trg_negocios_updated_at" BEFORE UPDATE ON "public"."negocios" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER "trg_reservas_updated_at" BEFORE UPDATE ON "public"."reservas" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
