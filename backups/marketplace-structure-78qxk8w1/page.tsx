import { ArrowRight, Check, Sparkles, Workflow } from "lucide-react";

import { ProductCard, products } from "./demo-catalogue";
import { MarketplaceSearch } from "./marketplace-shell";
import styles from "./home.module.css";

export default function DiscoverPage() {
  return (
    <main>
      <section id="discover" className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>
            <Sparkles size={13} />
            A NEW DIMENSION FOR DIGITAL CREATIVITY
          </div>

          <h1>
            Discover work that
            <span> moves you forward.</span>
          </h1>

          <p className={styles.heroDescription}>
            Browse extraordinary digital tools, templates, workflows
            and resources from independent creators. Find your next
            shortcut to something brilliant.
          </p>

          <MarketplaceSearch hero />

          <div className={styles.heroBenefits}>
            <span>Made by creators</span>
            <span>Digital products</span>
            <span>Explore freely</span>
          </div>
        </div>

        <div className={styles.heroArtwork} aria-hidden="true">
          <div className={`${styles.floatingTile} ${styles.analyticsTile}`}>
            <span>ANALYTICS DASHBOARD</span>
            <div className={styles.heroBars}>
              {[35, 58, 49, 77, 64, 91, 72].map((height, index) => (
                <i key={index} style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>

          <div className={`${styles.floatingTile} ${styles.workflowTile}`}>
            <span>WORKFLOW READY</span>
            <div>
              <Workflow size={17} />
              <ArrowRight size={15} />
              <Sparkles size={17} />
              <ArrowRight size={15} />
              <Check size={17} />
            </div>
          </div>

          <div className={`${styles.floatingTile} ${styles.categoryTile}`}>
            <strong>13 CATEGORIES</strong>
            <small>More ways to create</small>
          </div>
        </div>
      </section>

      <section id="products" className={styles.productsSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>CURATED FOR DISCOVERY</span>
            <h2>Discover the Products</h2>
            <p>A preview of the kind of digital creations you&apos;ll find on KitCart.</p>
          </div>
          <span className={styles.previewBadge}>DEMO CATALOGUE</span>
        </div>

        <div className={styles.productGrid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}
