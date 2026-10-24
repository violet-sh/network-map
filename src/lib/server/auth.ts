import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from "$app/env/private";
import { createId } from "@paralleldrive/cuid2";
import { GitHub } from "arctic";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";

import type { RequestEvent } from "@sveltejs/kit";

export const DAY_IN_MS = 1000 * 60 * 60 * 24;
export const sessionCookieName = "auth-session";

export const github = new GitHub(GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, null);

export async function createSession(userId: string) {
	const id = createId();
	const secret = createId();
	const secretHash = await hashSecret(secret);

	const session = {
		id,
		secretHash,
		userId,
		createdAt: new Date()
	};
	await db.insert(schema.sessionsTable).values(session);

	const token = id + "." + secret;
	const expiresAt = new Date(Date.now() + DAY_IN_MS * 30);

	return { ...session, token, expiresAt };
}

export async function validateSessionToken(token: string) {
	const [id, secret] = token.split(".");

	const session = await db.query.sessionsTable.findFirst({ where: eq(schema.sessionsTable.id, id) });

	if (!session) {
		return { session: null, user: null };
	}

	const secretHash = await hashSecret(secret);

	if (secretHash !== session.secretHash) {
		return { session: null, user: null };
	}

	if (Date.now() >= session.createdAt.getTime() + DAY_IN_MS * 30) {
		await db.delete(schema.sessionsTable).where(eq(schema.sessionsTable.id, session.id));
		return { session: null, user: null };
	}

	const user = await db.query.usersTable.findFirst({ where: eq(schema.usersTable.id, session.userId) });

	if (!user) {
		return { session: null, user: null };
	}

	return { session, user };
}

export async function invalidateSession(id: string) {
	await db.delete(schema.sessionsTable).where(eq(schema.sessionsTable.id, id));
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date) {
	event.cookies.set(sessionCookieName, token, {
		expires: expiresAt,
		path: "/"
	});
}

export function deleteSessionTokenCookie(event: RequestEvent) {
	event.cookies.delete(sessionCookieName, {
		path: "/"
	});
}

async function hashSecret(secret: string) {
	const secretBytes = new TextEncoder().encode(secret);
	const secretHashBuffer = await crypto.subtle.digest("SHA-256", secretBytes);
	return new Uint8Array(secretHashBuffer).toHex();
}
