import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { resolveDatabaseUrl } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __reviewmaxDbClient: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  return postgres(resolveDatabaseUrl(), {
    max: 10,
    prepare: false,
  });
}

const client = globalThis.__reviewmaxDbClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__reviewmaxDbClient = client;
}

export const db = drizzle(client, { schema });

export type Db = typeof db;
