import { createId } from "@paralleldrive/cuid2";
import { lineString } from "drizzle-postgis/models";
import { pgTable, integer, text, real, jsonb, timestamp } from "drizzle-orm/pg-core";

export const popsTable = pgTable("pops", {
	id: text().primaryKey(),
	type: text().notNull(),
	name: text().notNull(),
	location: text().notNull(),
	longitude: real().notNull(),
	latitude: real().notNull(),
	provider: text().notNull(),
	peeringdbId: integer(),
	connections: jsonb().notNull().default([]),
	exchanges: jsonb().notNull().default([])
});

export const exchangesTable = pgTable("exchanges", {
	id: integer().primaryKey(),
	name: text().notNull()
});

export const connectionsTable = pgTable("connections", {
	id: text().primaryKey().$defaultFn(createId),
	type: text().notNull(),
	name: text().notNull(),
	pops: jsonb().notNull().default([]),
	provider: text().notNull(),
	cable: text(),
	route: lineString("route").notNull()
});

export const providersTable = pgTable("providers", {
	id: text().primaryKey().$defaultFn(createId),
	name: text().notNull(),
	color: text().notNull()
});

export const usersTable = pgTable("users", {
	id: text().primaryKey().$defaultFn(createId),
	githubId: integer().notNull(),
	username: text().notNull()
});

export const sessionsTable = pgTable("sessions", {
	id: text().primaryKey(),
	secretHash: text().notNull(),
	userId: text().notNull(),
	createdAt: timestamp().notNull(),
	lastVerifiedAt: timestamp()
});
