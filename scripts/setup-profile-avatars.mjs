import { readFile } from "node:fs/promises";
import pg from "pg";

if (!process.env.DATABASE_URL?.trim()) {
  console.error("Set DATABASE_URL in .env.local before setting up profile photos.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  const file = new URL("../database/migrations/005_profile_avatars.sql", import.meta.url);
  await pool.query(await readFile(file, "utf8"));
  console.log("Profile photo storage ready.");
} catch (error) {
  console.error(`Profile photo setup failed (${typeof error?.code === "string" ? error.code : "unknown error"}).`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
