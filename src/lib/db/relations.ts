import { relations } from "drizzle-orm/relations";
import { negocios, profesionales, servicios, historial, reservas, profesionalServicios } from "./schema";

export const profesionalesRelations = relations(profesionales, ({one, many}) => ({
	negocio: one(negocios, {
		fields: [profesionales.negocioId],
		references: [negocios.id]
	}),
	reservas: many(reservas),
	profesionalServicios: many(profesionalServicios),
}));

export const negociosRelations = relations(negocios, ({many}) => ({
	profesionales: many(profesionales),
	servicios: many(servicios),
	historials: many(historial),
	reservas: many(reservas),
}));

export const serviciosRelations = relations(servicios, ({one, many}) => ({
	negocio: one(negocios, {
		fields: [servicios.negocioId],
		references: [negocios.id]
	}),
	profesionalServicios: many(profesionalServicios),
}));

export const historialRelations = relations(historial, ({one}) => ({
	negocio: one(negocios, {
		fields: [historial.negocioId],
		references: [negocios.id]
	}),
}));

export const reservasRelations = relations(reservas, ({one}) => ({
	negocio: one(negocios, {
		fields: [reservas.negocioId],
		references: [negocios.id]
	}),
	profesionale: one(profesionales, {
		fields: [reservas.profesionalId],
		references: [profesionales.id]
	}),
}));

export const profesionalServiciosRelations = relations(profesionalServicios, ({one}) => ({
	profesionale: one(profesionales, {
		fields: [profesionalServicios.profesionalId],
		references: [profesionales.id]
	}),
	servicio: one(servicios, {
		fields: [profesionalServicios.servicioId],
		references: [servicios.id]
	}),
}));