import "server-only";

import { getDb } from "@/lib/db";

export async function checkDatabaseHealth() {
  const db = getDb();

  const connection = await db.query<{
    database_name: string;
    database_user: string;
  }>(`
    SELECT
      current_database() AS database_name,
      current_user AS database_user
  `);

  const tables = await db.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  return {
    connected: true,
    database: connection.rows[0]?.database_name,
    user: connection.rows[0]?.database_user,
    tableCount: tables.rowCount ?? 0,
    tables: tables.rows.map((row) => row.table_name),
  };
}
