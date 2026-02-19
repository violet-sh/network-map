import { PEERING_DB_KEY } from "$env/static/private";
import { PUBLIC_MAPTILER_KEY } from "$env/static/public";
import { initTRPC, TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import type { Context } from "$lib/trpc/context";
import type { Connection, Exchange, Pop, Provider } from "$lib/types";
import type { LineString } from "drizzle-postgis";
import { geocoding } from "@maptiler/client";

export const t = initTRPC.context<Context>().create();

export const auth = t.middleware(async ({ next, ctx }) => {
	if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
	return next();
});

export const router = t.router({
	getPops: t.procedure.query(async ({ ctx }) => {
		return (await ctx.db.query.popsTable.findMany()) as Pop[];
	}),

	getPop: t.procedure
		.input(
			z.object({
				id: z.string()
			})
		)
		.query(async ({ ctx, input }) => {
			return await ctx.db.query.popsTable.findFirst({ where: eq(ctx.schema.popsTable.id, input.id) });
		}),

	addPop: t.procedure
		.use(auth)
		.input(
			z.object({
				id: z.string(),
				peeringdbId: z.number(),
				type: z.string(),
				provider: z.string()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const pdbObj = await fetch(`https://www.peeringdb.com/api/fac/${input.peeringdbId}`, {
				headers: { Authorization: "Api-Key " + PEERING_DB_KEY }
			})
				.then((req) => req.json())
				.then((json) => json.data[0]);
			const location = [pdbObj.address1, pdbObj.address2, pdbObj.city, pdbObj.state, pdbObj.country].filter((s) => s).join(", ");

			let [longitude, latitude] = [pdbObj.longitude, pdbObj.latitude];
			if (longitude === null || latitude === null) {
				const result = await geocoding.forward(location, { apiKey: PUBLIC_MAPTILER_KEY, limit: 1 });
				[longitude, latitude] = result.features[0].center;
			}

			const pop = {
				id: input.id,
				peeringdbId: input.peeringdbId,
				type: input.type,
				name: pdbObj.name,
				location,
				longitude: longitude || 0,
				latitude: latitude || 0,
				provider: input.provider
			};
			await ctx.db.insert(ctx.schema.popsTable).values(pop);
		}),

	updatePop: t.procedure
		.use(auth)
		.input(
			z.object({
				id: z.string(),
				type: z.string().optional(),
				provider: z.string().optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const pop = await ctx.db.query.popsTable.findFirst({ where: eq(ctx.schema.popsTable.id, input.id) });

			if (pop === undefined) {
				throw Error("Pop doesn't exist");
			}

			const updated = { type: input.type, provider: input.provider };
			await ctx.db.update(ctx.schema.popsTable).set(updated).where(eq(ctx.schema.popsTable.id, pop.id));
		}),

	addExchangeToPop: t.procedure
		.use(auth)
		.input(
			z.object({
				id: z.number(),
				pop: z.string()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const pop = (await ctx.db.query.popsTable.findFirst({ where: eq(ctx.schema.popsTable.id, input.pop) })) as Pop;

			if (!pop) {
				throw Error("Pop doesn't exist");
			}

			// Create exchange if it doesn't exist
			let exchange = await ctx.db.query.exchangesTable.findFirst({ where: eq(ctx.schema.exchangesTable.id, input.id) });
			if (!exchange) {
				const pdbObj = await fetch(`https://www.peeringdb.com/api/ix/${input.id}`, { headers: { Authorization: "Api-Key " + PEERING_DB_KEY } })
					.then((req) => req.json())
					.then((json) => json.data[0]);
				exchange = { id: pdbObj.id, name: pdbObj.name };

				await ctx.db.insert(ctx.schema.exchangesTable).values(exchange);
			}

			// Add exchange to pop's exchanges list
			pop.exchanges.push(exchange.id);
			await ctx.db.update(ctx.schema.popsTable).set({ exchanges: pop.exchanges }).where(eq(ctx.schema.popsTable.id, pop.id));
		}),

	removeExchangeFromPop: t.procedure
		.use(auth)
		.input(
			z.object({
				id: z.number(),
				pop: z.string()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const pop = (await ctx.db.query.popsTable.findFirst({ where: eq(ctx.schema.popsTable.id, input.pop) })) as Pop;

			if (!pop) {
				throw Error("Pop doesn't exist");
			}

			// Remove exchange from pop's exchanges list
			const index = pop.exchanges.indexOf(input.id);
			pop.exchanges.splice(index, 1);
			await ctx.db.update(ctx.schema.popsTable).set({ exchanges: pop.exchanges }).where(eq(ctx.schema.popsTable.id, pop.id));

			// TOOD: Should only be done if not used by other pops
			// await db.deleteExchange(exchange.id);
		}),

	deletePop: t.procedure
		.use(auth)
		.input(
			z.object({
				id: z.string()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const pop = (await ctx.db.query.popsTable.findFirst({ where: eq(ctx.schema.popsTable.id, input.id) })) as Pop;

			if (pop === undefined) {
				throw Error("Pop doesn't exist");
			}

			for (const connection of pop.connections) {
				// Should trigger something
			}

			// Has to go after connection removal, otherwise db will try to update nonexistent pop
			await ctx.db.delete(ctx.schema.popsTable).where(eq(ctx.schema.popsTable.id, pop.id));
		}),

	getExchanges: t.procedure.query(async ({ ctx }) => {
		return (await ctx.db.query.exchangesTable.findMany()) as Exchange[];
	}),

	getExchange: t.procedure
		.input(
			z.object({
				id: z.number()
			})
		)
		.query(async ({ ctx, input }) => {
			return await ctx.db.query.exchangesTable.findFirst({ where: eq(ctx.schema.exchangesTable.id, input.id) });
		}),

	getConnections: t.procedure.query(async ({ ctx }) => {
		return (await ctx.db.query.connectionsTable.findMany()) as Connection[];
	}),

	getConnection: t.procedure
		.input(
			z.object({
				id: z.string()
			})
		)
		.query(async ({ ctx, input }) => {
			return await ctx.db.query.connectionsTable.findFirst({ where: eq(ctx.schema.connectionsTable.id, input.id) });
		}),

	addConnection: t.procedure
		.use(auth)
		.input(
			z.object({
				pops: z.string().array(),
				type: z.string(),
				provider: z.string(),
				cable: z.string().optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const pops = (await ctx.db.query.popsTable.findMany({ where: inArray(ctx.schema.popsTable.id, input.pops) })) as Pop[];
			pops.sort(comparePops);

			const popList = pops.map((pop) => pop.id);
			const name = popList.join(" - ");
			const route: LineString = {
				type: "LineString",
				coordinates: pops.map((pop) => [pop.longitude, pop.latitude])
			};

			const connection = { ...input, pops: popList, name, route };

			const output = await ctx.db.insert(ctx.schema.connectionsTable).values(connection).returning();
			const id = output[0].id;

			for (const pop of pops) {
				pop.connections.push(id);
				await ctx.db.update(ctx.schema.popsTable).set({ connections: pop.connections }).where(eq(ctx.schema.popsTable.id, pop.id));
			}
		}),

	updateConnection: t.procedure
		.use(auth)
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
		.mutation(async ({ ctx, input }) => {
			const connection = (await ctx.db.query.connectionsTable.findFirst({ where: eq(ctx.schema.connectionsTable.id, input.id) })) as Connection;

			if (connection === undefined) {
				throw Error("Connection doesn't exist");
			}

			let route: LineString | undefined;
			if (input.route) {
				route = JSON.parse(input.route);
			}

			const updated = { pops: input.pops, type: input.type, provider: input.provider, cable: input.cable, route };
			await ctx.db.update(ctx.schema.connectionsTable).set(updated).where(eq(ctx.schema.connectionsTable.id, connection.id));
		}),

	deleteConnection: t.procedure
		.use(auth)
		.input(
			z.object({
				id: z.string()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const connection = (await ctx.db.query.connectionsTable.findFirst({ where: eq(ctx.schema.connectionsTable.id, input.id) })) as Connection;

			if (connection === undefined) {
				throw Error("Connection doesn't exist");
			}

			await ctx.db.delete(ctx.schema.connectionsTable).where(eq(ctx.schema.connectionsTable.id, connection.id));

			const pops = (await ctx.db.query.popsTable.findMany({ where: inArray(ctx.schema.popsTable.id, connection.pops) })) as Pop[];
			for (const pop of pops) {
				const index = pop.connections.indexOf(connection.id);
				pop.connections.splice(index, 1);
				await ctx.db.update(ctx.schema.popsTable).set({ connections: pop.connections }).where(eq(ctx.schema.popsTable.id, pop.id));
			}
		}),

	getProviders: t.procedure.query(async ({ ctx }) => {
		return (await ctx.db.query.providersTable.findMany()) as Provider[];
	}),

	getProvider: t.procedure
		.input(
			z.object({
				id: z.string()
			})
		)
		.query(async ({ ctx, input }) => {
			return await ctx.db.query.providersTable.findFirst({ where: eq(ctx.schema.providersTable.id, input.id) });
		}),

	addProvider: t.procedure
		.use(auth)
		.input(
			z.object({
				name: z.string(),
				color: z.string()
			})
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.db.insert(ctx.schema.providersTable).values(input);
		})
});

export function comparePops(a: Pop, b: Pop) {
	if (a.longitude === b.longitude) {
		return a.longitude - b.longitude;
	}
	return a.latitude - b.latitude;
}

export const createCaller = t.createCallerFactory(router);

export type Router = typeof router;
