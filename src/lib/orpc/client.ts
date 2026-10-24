import { browser } from "$app/env";
import { createORPCClient, onError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import type { Router } from "./router";
import type { RouterClient } from "@orpc/server";

const link = new RPCLink({
	origin: browser ? window.location.origin : "http://localhost:5173",
	url: "/api/rpc",
	interceptors: [
		onError((error) => {
			console.error(error);
		})
	]
});

const client: RouterClient<Router> = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
