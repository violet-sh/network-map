import { db, schema } from "#lib/server/db/index.ts";
import { sessionCookieName, validateSessionToken } from "#lib/server/auth.ts";
import type { RequestEvent } from "@sveltejs/kit";

export async function createContext(event: RequestEvent) {
	const sessionToken = event.cookies.get(sessionCookieName);

	if (!sessionToken) {
		return { event, db, schema };
	}

	const { user } = await validateSessionToken(sessionToken);
	if (user) {
		return { event, db, schema, userId: user.id };
	}

	return { event, db, schema };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
