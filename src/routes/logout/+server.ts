import { invalidateSession, deleteSessionTokenCookie } from "#lib/server/auth.ts";
import { type RequestEvent, fail, redirect } from "@sveltejs/kit";

export async function GET(event: RequestEvent) {
	if (event.locals.session === null) {
		return fail(401);
	}
	await invalidateSession(event.locals.session.id);
	deleteSessionTokenCookie(event);
	return redirect(302, "/");
}
