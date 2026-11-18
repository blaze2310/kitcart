import "server-only";

import { Pool } from "pg";

declare global {
  var kitcartDbPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

export function getDb(): Pool {
  if (!globalThis.kitcartDbPool) {
    globalThis.kitcartDbPool = createPool();
  }

  return globalThis.kitcartDbPool;
}
