"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  Code2,
  LayoutTemplate,
  Menu,
  Presentation,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  UserRound,
  Workflow,
  X,
} from "lucide-react";
import styles from "./home.module.css";

type Product = {
  id: number;
  title: string;
  category: string;
  type: "analytics" | "automation" | "website" | "slides";
  price: number;
  creator: string;
  description: string;
};

const products: Product[] = [
  {
    id: 1,
    title: "Revenue Pulse Dashboard",
    category: "BI DASHBOARDS",
    type: "analytics",
    price: 1299,
    creator: "Studio North",
    description: "A customizable business analytics dashboard.",
  },
  {
    id: 2,
    title: "FlowPilot — n8n Kit",
    category: "AUTOMATIONS",
    type: "automation",
    price: 799,
    creator: "Automate Lab",
    description: "Reusable workflows for everyday automation.",
  },
  {
    id: 3,
    title: "Nebula Web Starter",
    category: "WEB TEMPLATES",
    type: "website",
    price: 1499,
    creator: "Buildsmith",
    description: "A responsive landing-page design system.",
  },
  {
    id: 4,
    title: "PitchOS Slide System",
    category: "PRESENTATIONS",
    type: "slides",
    price: 599,
    creator: "Slide Forge",
    description: "An editable presentation template collection.",
  },
];

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

function ProductPreview({ type }: { type: Product["type"] }) {
  if (type === "analytics") {
    return (
      <div className={`${styles.preview} ${styles.analyticsPreview}`}>
        <span className={styles.previewEyebrow}>
          PERFORMANCE / ANALYTICS
        </span>
        <div className={styles.chartGrid}>
          <div className={styles.chartPanel}>
            <svg viewBox="0 0 180 95" aria-hidden="true">
              <path d="M10 78H169M10 78V10" fill="none"
                stroke="#82a7c2" strokeWidth="1.5" />
              <path d="M22 72L49 57L76 62L104 31L133 38L163 12"
                fill="none" stroke="#9DEBF1" strokeWidth="3"
                strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 81L53 74L83 54L110 61L140 28L166 23"
                fill="none" stroke="#A8B5FF" strokeWidth="2.5"
                strokeLinecap="round" />
            </svg>
          </div>
          <div className={styles.smallChart}>
            {[32, 58, 47, 81, 67].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <BarChart3 className={styles.previewCornerIcon} size={18} />
      </div>
    );
  }

  if (type === "automation") {
    return (
      <div className={`${styles.preview} ${styles.automationPreview}`}>
        <span className={styles.previewEyebrow}>
          WORKFLOW / AUTOMATION
        </span>
        <div className={styles.workflowNodes}>
          <span><Workflow size={23} /></span>
          <i />
          <span><Sparkles size={23} /></span>
          <i />
          <span><Check size={25} /></span>
        </div>
        <div className={styles.previewFootnote}>WORKFLOW READY</div>
      </div>
    );
  }

  if (type === "website") {
    return (
      <div className={`${styles.preview} ${styles.websitePreview}`}>
        <span className={styles.previewEyebrow}>
          THE NEBULA FRAMEWORK
        </span>
        <div className={styles.browserPreview}>
          <div className={styles.browserTop}>
            <span /><span /><span />
          </div>
          <div className={styles.browserContent}>
            <strong>Beyond ordinary</strong>
            <p>Beautiful digital experiences for your next idea.</p>
            <div className={styles.browserButton} />
            <div className={styles.browserCircle} />
          </div>
        </div>
        <LayoutTemplate className={styles.previewCornerIcon} size={18} />
      </div>
    );
  }

  return (
    <div className={`${styles.preview} ${styles.slidesPreview}`}>
      <span className={styles.previewEyebrow}>
        PRESENTATION SYSTEM
      </span>
      <div className={styles.slideSheet}>
        <strong>PITCH</strong>
        <small>Modern presentation</small>
        <div className={styles.slideRing} />
      </div>
      <Presentation className={styles.previewCornerIcon} size={18} />
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article className={styles.productCard}>
      <ProductPreview type={product.type} />
      <div className={styles.productInfo}>
        <span className={styles.productCategory}>
          {product.category}
        </span>
        <h3>{product.title}</h3>
        <p>{product.description}</p>
        <div className={styles.productBottom}>
          <span>By {product.creator}</span>
          <strong>₹{product.price.toLocaleString("en-IN")}</strong>
        </div>
        <span className={styles.demoLabel}>
          Concept listing · Preview only
        </span>
      </div>
    </article>
  );
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [message, setMessage] = useState("");

  const filteredProducts = useMemo(() => {
    const search = appliedQuery.trim().toLowerCase();
    if (!search) return products;

    return products.filter((product) =>
      [
        product.title,
        product.category,
        product.creator,
        product.description,
      ].some((value) => value.toLowerCase().includes(search))
    );
  }, [appliedQuery]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedQuery(query);
    setMenuOpen(false);
    document.getElementById("products")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function showComingSoon(feature: string) {
    setMessage(
      `${feature} will be connected during the next marketplace development stages.`
    );
  }

  return (
    <div className={styles.marketplace}>
      <div className={styles.aurora} aria-hidden="true">
        <div className={styles.auroraGlow} />
        <div className={styles.auroraRibbon} />
        <div className={styles.creamWave} />
        <div className={styles.cyanWave} />
      </div>

      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="KitCart home">
            <span className={styles.brandIcon}>K</span>
            <span className={styles.brandWords}>
              <strong>kitcart.</strong>
              <small>THE DIGITAL MARKETPLACE</small>
            </span>
          </Link>

          <nav className={styles.desktopNav} aria-label="Main navigation">
            <a href="#discover">Discover</a>
            <a href="#categories">
              Explore <ChevronDown size={13} />
            </a>
            <a href="#about">About</a>
            <a href="#help">Help</a>
          </nav>

          <form className={styles.navSearch} onSubmit={submitSearch}>
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="Search digital products"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search anything..."
            />
          </form>

          <button
            type="button"
            className={styles.sellerButton}
            onClick={() => showComingSoon("Seller onboarding")}
          >
            Start selling <ArrowUpRight size={15} />
          </button>

          <button
            type="button"
            className={styles.navIcon}
            aria-label="Shopping cart"
            onClick={() => showComingSoon("Shopping cart")}
          >
            <ShoppingCart size={19} />
          </button>

          <Link href="/login" className={styles.navIcon}
            aria-label="Sign in">
            <UserRound size={19} />
          </Link>

          <button
            type="button"
            className={styles.mobileMenuButton}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </header>

        {menuOpen && (
          <nav className={styles.mobileMenu} aria-label="Mobile navigation">
            <a href="#discover" onClick={() => setMenuOpen(false)}>
              Discover
            </a>
            <a href="#categories" onClick={() => setMenuOpen(false)}>
              Explore categories
            </a>
            <a href="#about" onClick={() => setMenuOpen(false)}>
              About
            </a>
            <a href="#help" onClick={() => setMenuOpen(false)}>
              Help
            </a>
            <Link href="/login">Sign in</Link>
            <button type="button" onClick={() => {
              setMenuOpen(false);
              showComingSoon("Seller onboarding");
            }}>
              Start selling
            </button>
          </nav>
        )}

        {message && (
          <div className={styles.message} role="status">
            <span>{message}</span>
            <button type="button" aria-label="Dismiss message"
              onClick={() => setMessage("")}>
              <X size={17} />
            </button>
          </div>
        )}

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

              <form className={styles.heroSearch} onSubmit={submitSearch}>
                <Search size={19} aria-hidden="true" />
                <input
                  aria-label="Find digital products"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder='Try "Power BI dashboard" or "website template"'
                />
                <button type="submit">
                  Search <ArrowUpRight size={16} />
                </button>
              </form>

              <div className={styles.heroBenefits}>
                <span>Made by creators</span>
                <span>Digital products</span>
                <span>Explore freely</span>
              </div>
            </div>

            <div className={styles.heroArtwork} aria-hidden="true">
              <div className={styles.orbitOne} />
              <div className={styles.orbitTwo} />
              <div className={styles.orbitThree} />

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

              <div className={styles.artworkHalo}>
                <Code2 size={38} strokeWidth={1.5} />
              </div>
            </div>
          </section>

          <section id="products" className={styles.productsSection}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>
                  CURATED FOR DISCOVERY
                </span>
                <h2>
                  {appliedQuery ? "Search results" : "Discover digital products"}
                </h2>
                <p>
                  {appliedQuery
                    ? `Showing concept listings matching "${appliedQuery}".`
                    : "A preview of the kind of digital creations you'll find on KitCart."}
                </p>
              </div>
              <span className={styles.previewBadge}>
                DEMO CATALOGUE
              </span>
            </div>

            {filteredProducts.length > 0 ? (
              <div className={styles.productGrid}>
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Search size={27} />
                <h3>No matching concept listings</h3>
                <p>Try a different keyword or browse the sample catalogue.</p>
                <button type="button" onClick={() => {
                  setQuery("");
                  setAppliedQuery("");
                }}>
                  Clear search
                </button>
              </div>
            )}
          </section>

          <section id="categories" className={styles.categoriesSection}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>EXPLORE YOUR POSSIBILITIES</span>
                <h2>Made for every kind of creator.</h2>
                <p>Explore the 13 main digital-product categories.</p>
              </div>
            </div>
            <div className={styles.categoryGrid}>
              {categories.map((category, index) => (
                <div className={styles.categoryItem} key={category}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{category}</strong>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </div>
              ))}
            </div>
            <p className={styles.categoryNote}>
              Category browsing and the complete subcategory menu are
              scheduled for the next development stage.
            </p>
          </section>

          <section className={styles.infoSection}>
            <div id="about" className={styles.infoCard}>
              <ShoppingBag size={26} />
              <h2>Digital creativity, made accessible.</h2>
              <p>
                KitCart is being built as a marketplace where independent
                creators can share practical digital products and customers
                can discover tools that help them work, learn and build.
              </p>
            </div>

            <div id="help" className={styles.infoCard}>
              <Sparkles size={26} />
              <h2>Something in mind?</h2>
              <p>
                Explore the concept catalogue or sign in to see our
                interactive KitCart companion. More marketplace features,
                seller tools and support options are in development.
              </p>
              <Link href="/login" className={styles.infoLink}>
                Meet your shopping buddy <ArrowUpRight size={16} />
              </Link>
            </div>
          </section>
        </main>

        <footer className={styles.footer}>
          <div className={styles.footerBrand}>
            <strong>kitcart.</strong>
            <span>A marketplace for digital creativity.</span>
          </div>
          <p>Marketplace preview · Features under development</p>
          <a href="#discover">Back to top ↑</a>
        </footer>
      </div>
    </div>
  );
}
