import { Suspense } from "react";
import { ArrowUpRight, Search } from "lucide-react";

import { ProductCard, catalogueCategories, catalogueProducts } from "@/features/shop/marketplace/demo-catalogue";
import { MarketplaceLink } from "@/features/shop/marketplace/marketplace-shell";
import styles from "@/features/shop/marketplace/home.module.css";
import shellStyles from "@/features/shop/marketplace/marketplace-shell.module.css";

const PAGE_SIZE = 12;
type Query = Promise<{ q?: string | string[]; category?: string | string[]; subcategory?: string | string[]; page?: string | string[] }>;

function first(value?: string | string[]) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

async function Catalogue({ searchParams }: { searchParams: Query }) {
  const params = await searchParams;
  const query = first(params.q);
  const requestedCategory = first(params.category);
  const category = catalogueCategories.find((name) => name === requestedCategory) ?? "";
  const subcategories = [...new Set(catalogueProducts
    .filter((product) => product.group === category)
    .map((product) => product.subcategory))];
  const subcategory = subcategories.find((name) => name === first(params.subcategory)) ?? "";
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = catalogueProducts.filter((product) => {
    const text = [product.title, product.group, product.subcategory, product.category,
      product.creator, product.description].join(" ").toLowerCase();
    return (!category || product.group === category) &&
      (!subcategory || product.subcategory === subcategory) &&
      terms.every((term) => text.includes(term));
  });
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const pageNumber = Math.max(1, Math.min(totalPages, parseInt(first(params.page), 10) || 1));
  const visible = matches.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE);

  function filterLink(group: string, sub = "", number = 1) {
    const filters = new URLSearchParams();
    if (query) filters.set("q", query);
    if (group) filters.set("category", group);
    if (sub) filters.set("subcategory", sub);
    if (number > 1) filters.set("page", String(number));
    return filters.size ? `/explore?${filters}` : "/explore";
  }

  return (
    <>
      <section className={styles.categoriesSection} aria-label="Categories">
        <div className={styles.categoryGrid}>
          {catalogueCategories.map((name, index) => (
            <MarketplaceLink
              key={name}
              href={filterLink(name)}
              className={styles.categoryItem}
              aria-current={category === name ? "true" : undefined}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{name}</strong>
              <ArrowUpRight size={16} aria-hidden="true" />
            </MarketplaceLink>
          ))}
        </div>
        {subcategories.length > 0 && (
          <nav className={styles.demoFilters} aria-label="Subcategories">
            <MarketplaceLink href={filterLink(category)} aria-current={!subcategory ? "true" : undefined}>
              All in category
            </MarketplaceLink>
            {subcategories.map((name) => (
              <MarketplaceLink key={name} href={filterLink(category, name)}
                aria-current={subcategory === name ? "true" : undefined}>
                {name}
              </MarketplaceLink>
            ))}
          </nav>
        )}
      </section>

      <section className={styles.productsSection} aria-labelledby="explore-results">
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="explore-results">{subcategory || category || (query ? "Search results" : "Demo products")}</h2>
            <p>{matches.length} demo {matches.length === 1 ? "product" : "products"}{query ? ` matching “${query}”` : ""}</p>
          </div>
          {(query || category) && (
            <MarketplaceLink href="/explore" className={styles.infoLink}>
              Clear filters
            </MarketplaceLink>
          )}
        </div>

        {matches.length ? (
          <div className={styles.productGrid}>
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Search size={27} aria-hidden="true" />
            <h3>No matching demo products</h3>
            <p>Try a different search or explore another category.</p>
          </div>
        )}
        {totalPages > 1 && (
          <nav className={styles.demoFilters} aria-label="Catalogue pages">
            {pageNumber > 1 && <MarketplaceLink href={filterLink(category, subcategory, pageNumber - 1)}>Previous</MarketplaceLink>}
            <span>Page {pageNumber} of {totalPages}</span>
            {pageNumber < totalPages && <MarketplaceLink href={filterLink(category, subcategory, pageNumber + 1)}>Next</MarketplaceLink>}
          </nav>
        )}
      </section>
    </>
  );
}

export default function ExplorePage({ searchParams }: { searchParams: Query }) {
  return (
    <main className={shellStyles.standalone}>
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.eyebrow}>EXPLORE YOUR POSSIBILITIES</span>
          <h1>Explore digital products</h1>
          <p>Browse 13 categories and 23 subcategories in the demo catalogue.</p>
        </div>
      </div>

      <Suspense fallback={<p role="status">Loading demo products…</p>}>
        <Catalogue searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
