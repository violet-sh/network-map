import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema";
import { DATABASE_URL } from "$app/env/private";
import { SQL } from "bun";

if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const client = new SQL(DATABASE_URL!);

const db = drizzle({ client, schema });

export { db, schema };
