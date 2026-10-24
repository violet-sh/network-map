import { createContext } from "./context";
import { router } from "./router";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

const client = createRouterClient(router, { context: createContext({}) });

export const orpc = createTanstackQueryUtils(client);
