import { ArrowUpRight, ShoppingBag, Sparkles } from "lucide-react";

import { MarketplaceLink } from "../marketplace-shell";
import styles from "../home.module.css";
import shellStyles from "../marketplace-shell.module.css";

export default function AboutPage() {
  return (
    <main className={shellStyles.standalone}>
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.eyebrow}>ABOUT KITCART</span>
          <h1>Digital creativity, made accessible.</h1>
          <p>A marketplace for digital tools made by independent creators.</p>
        </div>
      </div>

      <section className={styles.infoSection} aria-label="Who KitCart is for">
        <article className={styles.infoCard}>
          <ShoppingBag size={26} aria-hidden="true" />
          <h2>For independent creators</h2>
          <p>
            KitCart is being built as a place for independent creators to share
            practical digital products, from templates to workflows.
          </p>
        </article>

        <article className={styles.infoCard}>
          <Sparkles size={26} aria-hidden="true" />
          <h2>For people who want to build</h2>
          <p>
            Discover digital tools that help you work, learn and create without
            starting from scratch.
          </p>
          <MarketplaceLink href="/explore" className={styles.infoLink}>
            Explore the catalogue <ArrowUpRight size={16} aria-hidden="true" />
          </MarketplaceLink>
        </article>
      </section>
    </main>
  );
}
