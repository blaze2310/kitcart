import { Suspense } from "react";
import { Search } from "lucide-react";

import { ProductCard } from "@/features/shop/marketplace/demo-catalogue";
import ExploreFilters from "@/features/shop/marketplace/explore-filters";
import { MarketplaceLink } from "@/features/shop/marketplace/marketplace-shell";
import styles from "@/features/shop/marketplace/home.module.css";
import shellStyles from "@/features/shop/marketplace/marketplace-shell.module.css";

import { findCataloguePage, getCatalogueGroups } from "@/lib/catalogue";
type Parameter = string | string[] | undefined;
type Query = Promise<{ q?: Parameter; category?: Parameter; subcategory?: Parameter; page?: Parameter }>;

function values(value: Parameter) {
  return (Array.isArray(value) ? value : value ? [value] : []).map((item) => item.trim()).filter(Boolean);
}

async function Catalogue({ searchParams }: { searchParams: Query }) {
  const [params, groups] = await Promise.all([searchParams, getCatalogueGroups()]);
  const query = (values(params.q)[0] ?? "").slice(0, 160);
  const requestedCategories = new Set(values(params.category));
  const categories = groups.map(({ name }) => name).filter((name) => requestedCategories.has(name));
  const allowedGroups = groups.filter(({ name }) => !categories.length || categories.includes(name));
  const requestedSubcategories = new Set(values(params.subcategory));
  const subcategories = allowedGroups.flatMap(({ children }) => children).filter((name) => requestedSubcategories.has(name));
  const { products: visible, total, page: pageNumber, totalPages } = await findCataloguePage({
    query, categories, subcategories,
    requestedPage: Number.parseInt(values(params.page)[0] ?? "", 10) || 1,
  });
  const title = subcategories.length === 1 ? subcategories[0]
    : categories.length === 1 && !subcategories.length ? categories[0]
    : query ? "Search results" : "Demo products";

  function pageLink(number: number) {
    const filters = new URLSearchParams();
    if (query) filters.set("q", query);
    categories.forEach((name) => filters.append("category", name));
    subcategories.forEach((name) => filters.append("subcategory", name));
    if (number > 1) filters.set("page", String(number));
    return filters.size ? `/explore?${filters}` : "/explore";
  }

  return (
    <>
      <ExploreFilters key={JSON.stringify([query, categories, subcategories, pageNumber])}
        groups={groups} categories={categories} subcategories={subcategories} query={query} />
      <section className={styles.productsSection} aria-labelledby="explore-results">
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="explore-results">{title}</h2>
            <p>{total} demo {total === 1 ? "product" : "products"}{query ? ` matching “${query}”` : ""}</p>
          </div>
          {(query || categories.length > 0 || subcategories.length > 0) && (
            <MarketplaceLink href="/explore" className={styles.infoLink}>Clear filters</MarketplaceLink>
          )}
        </div>

        {visible.length > 0 ? (
          <div className={styles.productGrid}>
            {visible.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Search size={27} aria-hidden />
            <h3>No matching demo products</h3>
            <p>Try another search or change the filters.</p>
          </div>
        )}

        {totalPages > 1 && (
          <nav className={styles.demoFilters} aria-label="Catalogue pages">
            {pageNumber > 1 && <MarketplaceLink href={pageLink(pageNumber - 1)}>Previous</MarketplaceLink>}
            <span>Page {pageNumber} of {totalPages}</span>
            {pageNumber < totalPages && <MarketplaceLink href={pageLink(pageNumber + 1)}>Next</MarketplaceLink>}
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
          <p>Browse the demo catalogue by category, or search for a product.</p>
        </div>
      </div>
      <Suspense fallback={<p role="status">Loading demo products…</p>}>
        <Catalogue searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
