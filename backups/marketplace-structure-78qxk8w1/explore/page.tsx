import { Suspense } from "react";
import { ArrowUpRight, Search } from "lucide-react";

import { ProductCard, products } from "../demo-catalogue";
import { MarketplaceLink } from "../marketplace-shell";
import styles from "../home.module.css";
import shellStyles from "../marketplace-shell.module.css";

const categories = [
  "Website & Web Design",
  "Automation & Workflows",
  "Presentations & Slides",
  "Career & Professional Documents",
  "Dashboards & Data Visualization",
  "Trading Strategies & Scripts",
  "Ebooks & Guides",
  "AI Video & Prompt Packs",
  "Spreadsheets & Calculators",
  "Social Media & Marketing Assets",
  "Graphic Design & Creative Assets",
  "Code & Developer Resources",
  "No-Code & App Templates",
];

const categoryByType = {
  website: "Website & Web Design",
  automation: "Automation & Workflows",
  slides: "Presentations & Slides",
  analytics: "Dashboards & Data Visualization",
};

type Query = Promise<{ q?: string | string[]; category?: string | string[] }>;

function first(value?: string | string[]) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

async function Catalogue({ searchParams }: { searchParams: Query }) {
  const params = await searchParams;
  const query = first(params.q);
  const category = first(params.category);
  const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = products.filter((product) => {
    const group = categoryByType[product.type];
    const text = [
      product.title,
      product.category,
      product.creator,
      product.description,
      group,
    ].join(" ").toLowerCase();
    return (!category || category === group) && searchTerms.every((term) => text.includes(term));
  });

  function categoryLink(name: string) {
    const filters = new URLSearchParams({ category: name });
    if (query) filters.set("q", query);
    return `/explore?${filters}`;
  }

  return (
    <>
      <section className={styles.categoriesSection} aria-label="Categories">
        <div className={styles.categoryGrid}>
          {categories.map((name, index) => (
            <MarketplaceLink
              key={name}
              href={categoryLink(name)}
              className={styles.categoryItem}
              aria-current={category === name ? "true" : undefined}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{name}</strong>
              <ArrowUpRight size={16} aria-hidden="true" />
            </MarketplaceLink>
          ))}
        </div>
      </section>

      <section className={styles.productsSection} aria-labelledby="explore-results">
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="explore-results">{category || (query ? "Search results" : "Demo products")}</h2>
            {query && <p>Showing concept listings matching “{query}”.</p>}
          </div>
          {(query || category) && (
            <MarketplaceLink href="/explore" className={styles.infoLink}>
              Clear filters
            </MarketplaceLink>
          )}
        </div>

        {matches.length ? (
          <div className={styles.productGrid}>
            {matches.map((product) => (
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
          <p>Browse 13 categories and see what is available in the demo catalogue.</p>
        </div>
      </div>

      <Suspense fallback={<p role="status">Loading demo products…</p>}>
        <Catalogue searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
