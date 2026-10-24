import { PEERING_DB_KEY } from "$app/env/private";
import { PUBLIC_MAPTILER_KEY } from "$app/env/public";
import { ORPCError, os } from "@orpc/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import type { Context } from "#lib/orpc/context.ts";
import type { Connection, Exchange, PoP, Provider } from "#lib/types.ts";
import type { LineString } from "drizzle-postgis";
import { geocoding } from "@maptiler/client";
import type { pops } from "#lib/server/db/schema.ts";

export const o = os.$context<Context>();

const timingMiddleware = o.middleware(async ({ next, path }) => {
	const start = Date.now();

	try {
		return await next();
	} finally {
		console.log(`[oRPC] ${path} took ${Date.now() - start}ms to execute`);
	}
});

const auth = o.middleware(async ({ context, next }) => {
	if (!context.userId) throw new ORPCError("UNAUTHORIZED");
	return next();
});

export const publicProcedure = o.use(timingMiddleware);

export const protectedProcedure = publicProcedure.use(auth);

export const router = {
	getPops: publicProcedure.handler(async ({ context }) => {
		return (await context.db.query.popsTable.findMany()) as PoP[];
	}),

	getPop: publicProcedure
		.input(
			z.object({
				id: z.string()
			})
		)
		.handler(async ({ context, input }) => {
			return await context.db.query.popsTable.findFirst({ where: eq(context.schema.popsTable.id, input.id) });
		}),

	addPop: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				peeringdbId: z.number(),
				type: z.string(),
				provider: z.string()
			})
		)
		.handler(async ({ context, input }) => {
			const pdbObj = await fetch(`https://www.peeringdb.com/api/fac/${input.peeringdbId}`, {
				headers: { Authorization: "Api-Key " + PEERING_DB_KEY }
			})
				.then((req) => req.json())
				.then((json) => json.data[0]);
			const address = [pdbObj.address1, pdbObj.address2, pdbObj.city, pdbObj.state, pdbObj.country].filter((s) => s).join(", ");

			let coordinates = [pdbObj.longitude, pdbObj.latitude] as [number, number];
			if (coordinates[0] === null || coordinates[1] === null) {
				const result = await geocoding.forward(address, { apiKey: PUBLIC_MAPTILER_KEY, limit: 1 });
				coordinates = result.features[0].center as [number, number];
			}

			const pop = {
				id: input.id,
				type: input.type as pops["type"],
				name: pdbObj.name,
				region: input.id.slice(0, -1),
				address,
				coordinates,
				provider: input.provider,
				peeringdbId: input.peeringdbId
			};
			await context.db.insert(context.schema.popsTable).values(pop);
		}),

	updatePop: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				type: z.string().optional(),
				provider: z.string().optional()
			})
		)
		.handler(async ({ context, input }) => {
			const pop = await context.db.query.popsTable.findFirst({ where: eq(context.schema.popsTable.id, input.id) });

			if (pop === undefined) {
				throw Error("Pop doesn't exist");
			}

			const updated = { type: input.type as pops["type"], provider: input.provider };
			await context.db.update(context.schema.popsTable).set(updated).where(eq(context.schema.popsTable.id, pop.id));
		}),

	addExchangeToPop: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				pop: z.string()
			})
		)
		.handler(async ({ context, input }) => {
			const pop = (await context.db.query.popsTable.findFirst({ where: eq(context.schema.popsTable.id, input.pop) })) as PoP;

			if (!pop) {
				throw Error("Pop doesn't exist");
			}

			// Create exchange if it doesn't exist
			let exchange = await context.db.query.exchangesTable.findFirst({ where: eq(context.schema.exchangesTable.id, input.id) });
			if (!exchange) {
				const pdbObj = await fetch(`https://www.peeringdb.com/api/ix/${input.id}`, { headers: { Authorization: "Api-Key " + PEERING_DB_KEY } })
					.then((req) => req.json())
					.then((json) => json.data[0]);
				exchange = { id: pdbObj.id, name: pdbObj.name };

				await context.db.insert(context.schema.exchangesTable).values(exchange);
			}

			// Add exchange to pop's exchanges list
			pop.exchanges.push(exchange.id);
			await context.db.update(context.schema.popsTable).set({ exchanges: pop.exchanges }).where(eq(context.schema.popsTable.id, pop.id));
		}),

	removeExchangeFromPop: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				pop: z.string()
			})
		)
		.handler(async ({ context, input }) => {
			const pop = (await context.db.query.popsTable.findFirst({ where: eq(context.schema.popsTable.id, input.pop) })) as PoP;

			if (!pop) {
				throw Error("Pop doesn't exist");
			}

			// Remove exchange from pop's exchanges list
			const index = pop.exchanges.indexOf(input.id);
			pop.exchanges.splice(index, 1);
			await context.db.update(context.schema.popsTable).set({ exchanges: pop.exchanges }).where(eq(context.schema.popsTable.id, pop.id));

			// TOOD: Should only be done if not used by other pops
			// await db.deleteExchange(exchange.id);
		}),

	deletePop: protectedProcedure
		.input(
			z.object({
				id: z.string()
			})
		)
		.handler(async ({ context, input }) => {
			const pop = (await context.db.query.popsTable.findFirst({ where: eq(context.schema.popsTable.id, input.id) })) as PoP;

			if (pop === undefined) {
				throw Error("Pop doesn't exist");
			}

			for (const connection of pop.connections) {
				// Should trigger something
			}

			// Has to go after connection removal, otherwise db will try to update nonexistent pop
			await context.db.delete(context.schema.popsTable).where(eq(context.schema.popsTable.id, pop.id));
		}),

	getExchanges: publicProcedure.handler(async ({ context }) => {
		return (await context.db.query.exchangesTable.findMany()) as Exchange[];
	}),

	getExchange: publicProcedure
		.input(
			z.object({
				id: z.number()
			})
		)
		.handler(async ({ context, input }) => {
			return await context.db.query.exchangesTable.findFirst({ where: eq(context.schema.exchangesTable.id, input.id) });
		}),

	getConnections: o.handler(async ({ context }) => {
		return (await context.db.query.connectionsTable.findMany()) as Connection[];
	}),

	getConnection: o
		.input(
			z.object({
				id: z.string()
			})
		)
		.handler(async ({ context, input }) => {
			return await context.db.query.connectionsTable.findFirst({ where: eq(context.schema.connectionsTable.id, input.id) });
		}),

	addConnection: protectedProcedure
		.input(
			z.object({
				pops: z.string().array(),
				type: z.string(),
				provider: z.string(),
				cable: z.string().optional()
			})
		)
		.handler(async ({ context, input }) => {
			const pops = (await context.db.query.popsTable.findMany({ where: inArray(context.schema.popsTable.id, input.pops) })) as PoP[];
			pops.sort(comparePops);

			const popList = pops.map((pop) => pop.id);
			const name = popList.join(" - ");
			const route: LineString = {
				type: "LineString",
				coordinates: pops.map((pop) => [pop.longitude, pop.latitude])
			};

			const connection = { ...input, pops: popList, name, route };

			const output = await context.db.insert(context.schema.connectionsTable).values(connection).returning();
			const id = output[0].id;

			for (const pop of pops) {
				pop.connections.push(id);
				await context.db.update(context.schema.popsTable).set({ connections: pop.connections }).where(eq(context.schema.popsTable.id, pop.id));
			}
		}),

	updateConnection: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				pops: z.string().array().optional(),
				type: z.string().optional(),
				provider: z.string().optional(),
				cable: z.string().optional(),
				route: z.string().optional()
			})
		)
		.handler(async ({ context, input }) => {
			const connection = (await context.db.query.connectionsTable.findFirst({
				where: eq(context.schema.connectionsTable.id, input.id)
			})) as Connection;

			if (connection === undefined) {
				throw Error("Connection doesn't exist");
			}

			let route: LineString | undefined;
			if (input.route) {
				route = JSON.parse(input.route);
			}

			const updated = { pops: input.pops, type: input.type, provider: input.provider, cable: input.cable, route };
			await context.db.update(context.schema.connectionsTable).set(updated).where(eq(context.schema.connectionsTable.id, connection.id));
		}),

	deleteConnection: protectedProcedure
		.input(
			z.object({
				id: z.string()
			})
		)
		.handler(async ({ context, input }) => {
			const connection = (await context.db.query.connectionsTable.findFirst({
				where: eq(context.schema.connectionsTable.id, input.id)
			})) as Connection;

			if (connection === undefined) {
				throw Error("Connection doesn't exist");
			}

			await context.db.delete(context.schema.connectionsTable).where(eq(context.schema.connectionsTable.id, connection.id));

			const pops = (await context.db.query.popsTable.findMany({ where: inArray(context.schema.popsTable.id, connection.pops) })) as PoP[];
			for (const pop of pops) {
				const index = pop.connections.indexOf(connection.id);
				pop.connections.splice(index, 1);
				await context.db.update(context.schema.popsTable).set({ connections: pop.connections }).where(eq(context.schema.popsTable.id, pop.id));
			}
		}),

	getProviders: publicProcedure.handler(async ({ context }) => {
		return (await context.db.query.providersTable.findMany()) as Provider[];
	}),

	getProvider: publicProcedure
		.input(
			z.object({
				id: z.string()
			})
		)
		.handler(async ({ context, input }) => {
			return await context.db.query.providersTable.findFirst({ where: eq(context.schema.providersTable.id, input.id) });
		}),

	addProvider: protectedProcedure
		.input(
			z.object({
				name: z.string(),
				color: z.string()
			})
		)
		.handler(async ({ context, input }) => {
			await context.db.insert(context.schema.providersTable).values(input);
		})
};

export function comparePops(a: PoP, b: PoP) {
	if (a.longitude === b.longitude) {
		return a.longitude - b.longitude;
	}
	return a.latitude - b.latitude;
}

export type Router = typeof router;
