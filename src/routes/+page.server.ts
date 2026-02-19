import { trpc } from "$lib/trpc/server";

import type { FeatureCollection, LineString, Point } from "drizzle-postgis";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
	const api = await trpc(event);

	const pops = await api.getPops();
	const exchanges = await api.getExchanges();
	const connections = await api.getConnections();
	const providers = await api.getProviders();

	const popsJson: FeatureCollection<Point> = {
		type: "FeatureCollection",
		features: pops.map((pop) => {
			return {
				type: "Feature",
				geometry: {
					type: "Point",
					coordinates: [pop.longitude, pop.latitude]
				},
				properties: {
					id: pop.id,
					provider: providers.findIndex((provider) => provider.id === pop.provider)
				}
			};
		})
	};

	const connectionsJson: FeatureCollection<LineString> = {
		type: "FeatureCollection",
		features: event.locals.user
			? connections.map((connection) => {
					const geometry = connection.route;

					return {
						type: "Feature",
						geometry,
						properties: {
							id: connection.id,
							provider: providers.findIndex((provider) => provider.id === connection.provider)
						}
					};
				})
			: []
	};

	return { pops, popsJson, exchanges, connections, connectionsJson, providers, user: event.locals.user };
};
