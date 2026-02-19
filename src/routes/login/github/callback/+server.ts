import { ALLOWED_USERS } from "$env/static/private";
import { github, createSession, setSessionTokenCookie } from "$lib/server/auth";
import { db, schema } from "$lib/server/db";

import type { RequestEvent } from "@sveltejs/kit";
import type { OAuth2Tokens } from "arctic";
import { eq } from "drizzle-orm";

export async function GET(event: RequestEvent): Promise<Response> {
	const code = event.url.searchParams.get("code");
	const state = event.url.searchParams.get("state");
	const storedState = event.cookies.get("github_oauth_state") ?? null;

	// Validate state
	if (code === null || state === null || storedState === null) {
		return new Response("invalid state", {
			status: 400
		});
	}
	if (state !== storedState) {
		return new Response("invalid state 2", {
			status: 400
		});
	}

	// Validate Authorization Code
	let tokens: OAuth2Tokens;
	try {
		tokens = await github.validateAuthorizationCode(code);
	} catch (e) {
		// Invalid code or client credentials
		return new Response("invalid code or creds", {
			status: 400
		});
	}

	// Get Github User Info
	const githubUserResponse = await fetch("https://api.github.com/user", {
		headers: {
			Authorization: `Bearer ${tokens.accessToken()}`
		}
	});
	const githubUser = await githubUserResponse.json();

	// Check if user already exists
	const existingUser = await db.query.usersTable.findFirst({ where: eq(schema.usersTable.githubId, githubUser.id) });

	if (existingUser) {
		const session = await createSession(existingUser.id);
		setSessionTokenCookie(event, session.token, session.expiresAt);
		return new Response(null, {
			status: 302,
			headers: {
				Location: "/"
			}
		});
	}

	// Create if user allowed
	const allowedUsers = JSON.parse(ALLOWED_USERS) as string[];
	if (allowedUsers.includes(githubUser.login)) {
		const [user] = await db.insert(schema.usersTable).values({ githubId: githubUser.id, username: githubUser.login }).returning();

		const session = await createSession(user.id);
		setSessionTokenCookie(event, session.token, session.expiresAt);

		return new Response(null, {
			status: 302,
			headers: {
				Location: "/"
			}
		});
	}

	return new Response(null, {
		status: 400
	});
}
