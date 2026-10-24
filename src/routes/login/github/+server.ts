import { github } from "#lib/server/auth.ts";
import { generateState } from "arctic";

import type { RequestEvent } from "@sveltejs/kit";

export async function GET(event: RequestEvent) {
	const state = generateState();
	const url = github.createAuthorizationURL(state, []);

	event.cookies.set("github_oauth_state", state, {
		path: "/",
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: "lax"
	});

	return new Response(null, {
		status: 302,
		headers: {
			Location: url.toString()
		}
	});
}
