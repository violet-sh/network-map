import { db, schema } from "#lib/server/db/index.ts";
import { sessionCookieName, validateSessionToken } from "#lib/server/auth.ts";
import type { Cookies } from "@sveltejs/kit";

export async function createContext(opts: { cookies?: Cookies }) {
	const sessionToken = opts.cookies?.get(sessionCookieName);

	if (!sessionToken) {
		return { db, schema };
	}

	const { user } = await validateSessionToken(sessionToken);
	if (user) {
		return { db, schema, userId: user.id };
	}

	return { db, schema };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
