import { createId } from "@paralleldrive/cuid2";
import { lineString } from "drizzle-postgis/models";
import { pgTable, integer, text, jsonb, timestamp, pgEnum, point, time } from "drizzle-orm/pg-core";

const cuid = text;

export const popType = pgEnum("pop_type", ["core", "edge", "cls", "ila"]);
export const segmentType = pgEnum("segment_type", ["subsea", "underground", "aerial"]);
export const rightOfWay = pgEnum("right_of_way", ["highway", "railway", "power line", "road"]);
export const routeType = pgEnum("route_type", ["long-haul", "metro"]);
export const routeStatus = pgEnum("route_status", ["proposal", "under construction", "active"]);
export const networkType = pgEnum("network_type", ["carrier", "custom"]);

export const regionsTable = pgTable("regions", {
	code: text().primaryKey(),
	name: text().notNull()
});

export const popsTable = pgTable("pops", {
	id: text().primaryKey(),
	type: popType().notNull(),
	name: text().notNull(),
	region: cuid().notNull(),
	address: text().notNull(),
	coordinates: point().notNull(),
	provider: cuid().notNull(),
	peeringdbId: integer(),
	exchanges: jsonb().notNull().default([])
});

export const exchangesTable = pgTable("exchanges", {
	id: integer().primaryKey(),
	name: text().notNull(),
	cacheTimestamp: time().notNull()
});

export const segmentsTable = pgTable("segments", {
	id: cuid().primaryKey().$defaultFn(createId),
	type: segmentType().notNull(),
	rightOfWay: rightOfWay(),
	geometry: lineString()
});

export const routesTable = pgTable("routes", {
	id: cuid().primaryKey().$defaultFn(createId),
	type: routeType().notNull(),
	name: text(),
	provider: cuid().notNull(),
	pops: jsonb().notNull().default([]),
	segments: jsonb().notNull().default([]),
	status: routeStatus().notNull(),
	available: jsonb().notNull().default({ waves: false, fiber: false })
});

export const wavesTable = pgTable("waves", {
	id: cuid().primaryKey().$defaultFn(createId),
	pops: jsonb().notNull().default([]),
	provider: cuid().notNull(),
	route: cuid()
});

export const networksTable = pgTable("networks", {
	id: cuid().primaryKey().$defaultFn(createId),
	type: networkType().notNull(),
	name: text().notNull(),
	color: text().notNull(),
	pops: jsonb().notNull().default([]),
	waves: jsonb().notNull().default([]),
	routes: jsonb().notNull().default([])
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

export type pops = typeof popsTable.$inferInsert;
export type popType = pops["type"];
