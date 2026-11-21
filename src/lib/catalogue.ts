import "server-only";

import { cache } from "react";
import { connection } from "next/server";
import type { catalogueProducts } from "@/features/shop/marketplace/demo-catalogue";
import { getDb } from "./db";

type Product = (typeof catalogueProducts)[number];
type Group = { name: string; children: string[] };

export const CATALOGUE_PAGE_SIZE = 12;

const productColumns = `id, title, category_group AS "group", subcategory, category,
  product_type AS type, price_inr AS price, creator, description, demo_cover AS "demoCover"`;

export async function getCatalogueGroups() {
  await connection();
  const { rows } = await getDb().query<{ category_group: string; subcategory: string }>(
    `SELECT category_group, subcategory
     FROM public.catalogue_products
     WHERE is_published
     GROUP BY category_group, subcategory
     ORDER BY min(sort_position), category_group, subcategory`,
  );

  const groups = new Map<string, Group>();
  for (const { category_group: name, subcategory } of rows) {
    const group = groups.get(name) ?? { name, children: [] };
    group.children.push(subcategory);
    groups.set(name, group);
  }
  return [...groups.values()];
}

export async function findCataloguePage(input: {
  query: string;
  categories: string[];
  subcategories: string[];
  requestedPage: number;
}) {
  await connection();
  const terms = input.query.toLowerCase().split(/\s+/).filter(Boolean);
  const requestedPage = Math.max(1, Math.min(2147483647, input.requestedPage));
  const { rows: [result] } = await getDb().query<{ total: number; page: number; products: Product[] }>(
    `WITH matches AS (
       SELECT ${productColumns}, sort_position
       FROM public.catalogue_products
       WHERE is_published
         AND (cardinality($1::text[]) = 0 OR category_group = ANY($1))
         AND (cardinality($2::text[]) = 0 OR subcategory = ANY($2))
         AND NOT EXISTS (
           SELECT 1 FROM unnest($3::text[]) AS filters(term)
           WHERE strpos(lower(concat_ws(' ', title, category_group, subcategory, category, creator, description)), term) = 0
         )
     ), totals AS (
       SELECT count(*)::int AS total FROM matches
     ), bounds AS (
       SELECT total, least($4::int, greatest(1, ceil(total::numeric / $5::int)::int)) AS page
       FROM totals
     ), visible AS (
       SELECT * FROM matches
       ORDER BY sort_position, id
       LIMIT $5::int OFFSET (SELECT (page - 1)::bigint * $5::int FROM bounds)
     )
     SELECT total, page,
       coalesce((SELECT jsonb_agg(to_jsonb(v) - 'sort_position' ORDER BY v.sort_position, v.id)
                 FROM visible AS v), '[]'::jsonb) AS products
     FROM bounds`,
    [input.categories, input.subcategories, terms, requestedPage, CATALOGUE_PAGE_SIZE],
  );

  return { ...result, totalPages: Math.max(1, Math.ceil(result.total / CATALOGUE_PAGE_SIZE)) };
}

export const getCatalogueProduct = cache(async (id: string) => {
  if (!/^[1-9]\d{0,9}$/.test(id) || Number(id) > 2147483647) return null;
  await connection();
  const { rows } = await getDb().query<Product>(
    `SELECT ${productColumns}
     FROM public.catalogue_products
     WHERE id = $1 AND is_published`,
    [Number(id)],
  );
  return rows[0] ?? null;
});
