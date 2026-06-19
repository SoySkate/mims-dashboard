import { pgTable, index, uuid, text, timestamp, foreignKey, jsonb, boolean, integer, numeric, uniqueIndex, check, bigint, date, time, primaryKey, pgSequence } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"


export const historialIdSeq = pgSequence("historial_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })

export const agentAlerts = pgTable("agent_alerts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	clienteTelefono: text("cliente_telefono").notNull(),
	clienteNombre: text("cliente_nombre"),
	motivo: text().notNull(),
	resumen: text(),
	mensajeCliente: text("mensaje_cliente"),
	status: text().default('pendiente'),
	enviadoEn: timestamp("enviado_en", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_alerts_pendientes").using("btree", table.negocioId.asc().nullsLast().op("timestamptz_ops"), table.clienteTelefono.asc().nullsLast().op("timestamptz_ops"), table.status.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
]);

export const profesionales = pgTable("profesionales", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	nombre: text().notNull(),
	servicios: text().array(),
	horario: jsonb(),
	activo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_profesionales_negocio").using("btree", table.negocioId.asc().nullsLast().op("uuid_ops")).where(sql`(activo = true)`),
	foreignKey({
			columns: [table.negocioId],
			foreignColumns: [negocios.id],
			name: "profesionales_negocio_id_fkey"
		}).onDelete("cascade"),
]);

export const servicios = pgTable("servicios", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	nombre: text().notNull(),
	duracionMinutos: integer("duracion_minutos").default(30).notNull(),
	precio: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	profesional: text(),
	categoria: text().default('General'),
	descripcion: text(),
	activo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_servicios_negocio").using("btree", table.negocioId.asc().nullsLast().op("uuid_ops")).where(sql`(activo = true)`),
	foreignKey({
			columns: [table.negocioId],
			foreignColumns: [negocios.id],
			name: "servicios_negocio_id_fkey"
		}).onDelete("cascade"),
]);

export const negocios = pgTable("negocios", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	slug: text().notNull(),
	nombre: text().notNull(),
	tipoVertical: text("tipo_vertical").notNull(),
	direccion: text(),
	phoneNumberId: text("phone_number_id").notNull(),
	duenoTelefono: text("dueno_telefono"),
	horario: jsonb(),
	maxDiasFuturos: integer("max_dias_futuros").default(14),
	zonaHoraria: text("zona_horaria").default('Europe/Madrid'),
	activo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	telefonoContacto: text("telefono_contacto"),
	emailContacto: text("email_contacto"),
	web: text(),
	instagram: text(),
	chatwootAccountId: text("chatwoot_account_id"),
	agenteActivo: boolean("agente_activo").default(true).notNull(),
}, (table) => [
	index("idx_negocios_phone_number_id").using("btree", table.phoneNumberId.asc().nullsLast().op("text_ops")).where(sql`(activo = true)`),
	uniqueIndex("negocios_phone_number_id_key").using("btree", table.phoneNumberId.asc().nullsLast().op("text_ops")),
	uniqueIndex("negocios_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

export const historial = pgTable("historial", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('historial_id_seq'::regclass)`).primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	clienteTelefono: text("cliente_telefono").notNull(),
	clienteNombre: text("cliente_nombre"),
	role: text().notNull(),
	mensaje: text().notNull(),
	sessionState: jsonb("session_state"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_historial_cliente").using("btree", table.negocioId.asc().nullsLast().op("timestamptz_ops"), table.clienteTelefono.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	foreignKey({
			columns: [table.negocioId],
			foreignColumns: [negocios.id],
			name: "historial_negocio_id_fkey"
		}).onDelete("cascade"),
	check("historial_role_check", sql`role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])`),
]);

export const reservas = pgTable("reservas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	clienteTelefono: text("cliente_telefono"),
	clienteNombre: text("cliente_nombre"),
	serviciosJson: jsonb("servicios_json"),
	serviciosResumen: text("servicios_resumen"),
	duracionMinutos: integer("duracion_minutos"),
	precioTotal: numeric("precio_total", { precision: 10, scale:  2 }),
	fecha: date().notNull(),
	horaInicio: time("hora_inicio").notNull(),
	horaFin: time("hora_fin").notNull(),
	profesional: text(),
	estado: text().default('pendiente_confirmacion_cliente').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	profesionalId: uuid("profesional_id"),
}, (table) => [
	index("idx_reservas_negocio_fecha").using("btree", table.negocioId.asc().nullsLast().op("date_ops"), table.fecha.asc().nullsLast().op("uuid_ops")).where(sql`(estado = ANY (ARRAY['confirmado'::text, 'pendiente_confirmacion_cliente'::text]))`),
	index("idx_reservas_profesional_fecha").using("btree", table.profesionalId.asc().nullsLast().op("date_ops"), table.fecha.asc().nullsLast().op("date_ops")).where(sql`(estado = ANY (ARRAY['confirmado'::text, 'pendiente_confirmacion_cliente'::text]))`),
	index("idx_reservas_telefono").using("btree", table.negocioId.asc().nullsLast().op("date_ops"), table.clienteTelefono.asc().nullsLast().op("text_ops"), table.fecha.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.negocioId],
			foreignColumns: [negocios.id],
			name: "reservas_negocio_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.profesionalId],
			foreignColumns: [profesionales.id],
			name: "reservas_profesional_id_fkey"
		}).onDelete("set null"),
	check("reservas_estado_check", sql`estado = ANY (ARRAY['pendiente_confirmacion_cliente'::text, 'confirmado'::text, 'cancelado'::text, 'descartado_cliente'::text])`),
]);

export const profesionalServicios = pgTable("profesional_servicios", {
	profesionalId: uuid("profesional_id").notNull(),
	servicioId: uuid("servicio_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.profesionalId],
			foreignColumns: [profesionales.id],
			name: "profesional_servicios_profesional_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.servicioId],
			foreignColumns: [servicios.id],
			name: "profesional_servicios_servicio_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.profesionalId, table.servicioId], name: "profesional_servicios_pkey"}),
]);
