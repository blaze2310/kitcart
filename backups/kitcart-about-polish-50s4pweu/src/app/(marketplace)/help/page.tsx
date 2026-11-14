import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { MarketplaceLink } from "@/features/shop/marketplace/marketplace-shell";
import styles from "@/features/shop/marketplace/home.module.css";
import shellStyles from "@/features/shop/marketplace/marketplace-shell.module.css";

export default function HelpPage() {
  return (
    <main className={shellStyles.standalone}>
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.eyebrow}>KITCART HELP</span>
          <h1>Something in mind?</h1>
        </div>
      </div>

      <section className={styles.infoCard} aria-label="What you can do now">
        <Sparkles size={26} aria-hidden="true" />
        <h2>What you can do now</h2>
        <p>
          Browse the concept catalogue or sign in to meet the interactive KitCart
          companion. Seller tools and support options are still in development.
        </p>
        <p>
          <MarketplaceLink href="/explore" className={styles.infoLink}>
            Browse the demo catalogue <ArrowUpRight size={16} aria-hidden="true" />
          </MarketplaceLink>
        </p>
        <p>
          <Link href="/login" className={styles.infoLink}>
            Meet your shopping buddy <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </p>
      </section>
    </main>
  );
}
