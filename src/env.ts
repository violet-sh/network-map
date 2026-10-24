import { defineEnvVars } from "@sveltejs/kit/env";

export const variables = defineEnvVars({
	ALLOWED_USERS: {
		static: true
	},
	DATABASE_URL: {},
	GITHUB_CLIENT_ID: {},
	GITHUB_CLIENT_SECRET: {},
	PEERING_DB_KEY: {},
	PUBLIC_MAPTILER_KEY: {
		public: true
	}
});
