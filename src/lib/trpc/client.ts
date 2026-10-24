import { browser } from "$app/env";
import { page } from "$app/state";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

import type { Router } from "./router";

export function trpc() {
	return createTRPCClient<Router>({
		links: [
			httpBatchLink({
				url: browser ? "/api/trpc" : `${page.url.origin}/api/trpc`
			})
		]
	});
}
