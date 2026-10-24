import { createContext } from "./context";

import { createRouterClient } from "@orpc/server";
import { router } from "./router";

export const orpc = createRouterClient(router, { context: createContext({}) });
