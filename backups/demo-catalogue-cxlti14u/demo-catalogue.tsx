import {
  BarChart3,
  Check,
  LayoutTemplate,
  Presentation,
  Sparkles,
  Workflow,
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

export const products: Product[] = [
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

export function ProductCard({ product }: { product: Product }) {
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
