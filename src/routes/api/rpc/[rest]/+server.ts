import { createContext } from "#lib/orpc/context.ts";
import { router } from "#lib/orpc/router.ts";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

import type { RequestHandler } from "@sveltejs/kit";

const handler = new RPCHandler(router, {
	interceptors: [
		onError((error) => {
			console.error(error);
		})
	]
});

export const fallback = (async (event) => {
	const { response } = await handler.handle(event.request, {
		prefix: "/api/rpc",
		context: await createContext({ cookies: event.cookies })
	});

	return response ?? new Response("Not found", { status: 404 });
}) satisfies RequestHandler;
