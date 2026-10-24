import { page } from "$app/state";
import { createORPCClient, onError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

import type { Router } from "./router";
import type { RouterClient } from "@orpc/server";

const link = new RPCLink({
	origin: page.url.origin,
	url: "/api/orpc",
	interceptors: [
		onError((error) => {
			console.error(error);
		})
	]
});

export const orpc: RouterClient<Router> = createORPCClient(link);
