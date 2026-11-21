import { readFile } from "node:fs/promises";
import pg from "pg";

if (!process.env.DATABASE_URL?.trim()) {
  console.error("Set DATABASE_URL in .env.local before setting up seller listings.");
  process.exit(1);
}
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  await db.connect();
  const lock = 12836781;
  await db.query("SELECT pg_advisory_lock($1)", [lock]);
  for (const name of ["005_profile_avatars.sql", "006_username_punctuation.sql", "007_seller_listings.sql"]) {
    const sql = await readFile(new URL(`../database/migrations/${name}`, import.meta.url), "utf8");
    await db.query(sql);
  }
  console.log("Profile photo, username and seller database setup complete.");
} catch (error) {
  console.error(`Setup failed (${error?.code ?? "unknown"}). Confirm the existing KitCart auth tables and constraints are present.`);
  process.exitCode = 1;
} finally { await db.end(); }
