import { readFile } from "node:fs/promises";
import pg from "pg";

if (!process.env.DATABASE_URL?.trim()) {
  console.error("Set DATABASE_URL in .env.local before setting up the catalogue.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });

try {
  for (const file of ["../database/migrations/004_product_catalogue.sql", "../database/seeds/001_demo_catalogue.sql"]) {
    await pool.query(await readFile(new URL(file, import.meta.url), "utf8"));
  }

  const { rows: [row] } = await pool.query(
    "SELECT count(*)::int AS published FROM public.catalogue_products WHERE is_published",
  );
  console.log(`Catalogue ready. ${row.published} published products.`);
} catch (error) {
  console.error(`Catalogue setup failed (${typeof error?.code === "string" ? error.code : "unknown error"}).`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
