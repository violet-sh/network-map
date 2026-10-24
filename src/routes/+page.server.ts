import { orpc } from "#lib/orpc/server.ts";

import type { FeatureCollection, LineString, Point } from "drizzle-postgis";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
	const pops = await orpc.getPops();
	const exchanges = await orpc.getExchanges();
	const connections = await orpc.getConnections();
	const providers = await orpc.getProviders();

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
