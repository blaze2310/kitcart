import {
  BarChart3,
  Check,
  LayoutTemplate,
  Presentation,
  Sparkles,
  Workflow,
} from "lucide-react";

import DemoArt from "./demo-art";
import { MarketplaceLink } from "./marketplace-shell";
import detailStyles from "./product-detail.module.css";
import styles from "./home.module.css";

type Product = {
  id: number;
  title: string;
  category: string;
  type: "analytics" | "automation" | "website" | "slides";
  price: number;
  creator: string;
  description: string;
  demoCover?: boolean;
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

// Three listings per subcategory. A number reuses an original Discover card.
type SeedGroup = [string, string, Product["type"], string, Array<string | number>];
const seedGroups: SeedGroup[] = [
  ["Website & Web Design", "Website & Landing Page Templates", "website", "Responsive layouts for launching and presenting a website.", [3, "Fieldwork Portfolio", "Launchline Landing Page"]],
  ["Website & Web Design", "UI Kits & Design Files", "website", "Editable design components for prototyping interfaces.", ["Prism Interface Kit", "Orbit Mobile UI", "Canvas Wireframe Library"]],
  ["Automation & Workflows", "Downloadable Workflow Files", "automation", "Demo workflows for common repetitive tasks.", [2, "Invoice Intake Flow", "Support Ticket Router"]],
  ["Automation & Workflows", "Shared Automation Templates", "automation", "Reusable workflow blueprints for connecting everyday tools.", ["Lead Handoff Blueprint", "Content Approval Flow", "Weekly Digest Builder"]],
  ["Automation & Workflows", "Automation Scripts", "automation", "Small utility scripts for organizing and processing files.", ["Batch Rename Toolkit", "CSV Cleanup Scripts", "Scheduled Folder Tidy"]],
  ["Presentations & Slides", "Editable Presentation Templates", "slides", "Editable slide layouts for communicating ideas clearly.", [4, "Boardroom Brief Deck", "Case Study Slides"]],
  ["Career & Professional Documents", "Professional Document Templates", "slides", "Editable documents for applications and career planning.", ["Meridian Résumé", "Cover Letter Studio", "Interview Story Workbook"]],
  ["Dashboards & Data Visualization", "BI Dashboard Templates", "analytics", "Dashboard layouts for exploring business performance.", [1, "Inventory Signal Dashboard", "Campaign Performance Board"]],
  ["Dashboards & Data Visualization", "Code-Based Dashboards", "analytics", "Dashboard concepts for building data views with code.", ["Streamlit Metrics Lab", "Plotly Sales Explorer", "React KPI Console"]],
  ["Trading Strategies & Scripts", "Trading Indicators & Signals", "analytics", "Illustrative market-analysis concepts using demo data.", ["Volatility Range Visualizer", "Trend Overlay Lab", "Volume Pattern Notebook"]],
  ["Trading Strategies & Scripts", "Trading Strategies & Bots", "analytics", "Paper-trading concepts for learning about simulated rules.", ["Paper Strategy Sandbox", "Backtest Journal Kit", "Rebalance Simulator"]],
  ["Ebooks & Guides", "Ebooks & Instruction Guides", "slides", "A structured reference for learning or practising a skill.", ["Freelancer Setup Guide", "SQL Practice Handbook", "Digital Product Launch Playbook"]],
  ["AI Video & Prompt Packs", "AI Prompt Packs", "slides", "Prompt collections for developing creative briefs and scenes.", ["Storyboard Prompt Pack", "Product Shot Prompt Studio", "Video Scene Prompt Cards"]],
  ["Spreadsheets & Calculators", "Spreadsheet & Calculator Templates", "analytics", "Editable spreadsheet concepts for tracking and planning.", ["Cash Flow Planner", "Freelance Rate Calculator", "Inventory Reorder Sheet"]],
  ["Social Media & Marketing Assets", "Editable Marketing Design Templates", "slides", "Editable visual assets for publishing across channels.", ["Carousel Design Kit", "Launch Campaign Templates", "Newsletter Layout Studio"]],
  ["Social Media & Marketing Assets", "Marketing Content & Copy Kits", "slides", "Writing frameworks for campaigns and product messaging.", ["Product Launch Copy Kit", "Email Sequence Workbook", "Content Calendar Prompts"]],
  ["Graphic Design & Creative Assets", "2D Graphic Assets & Mockups", "website", "Visual assets for illustrating and presenting design work.", ["Terra Icon Set", "Studio Device Mockups", "Contour Texture Pack"]],
  ["Graphic Design & Creative Assets", "Fonts, Presets & LUTs", "website", "Concept packs for typography and visual treatments.", ["Monoform Type Specimen", "Softgrain Photo Presets", "Twilight Colour LUTs"]],
  ["Graphic Design & Creative Assets", "3D Models", "website", "Sample asset concepts for building scenes and mockups.", ["Low-Poly Desk Props", "Modular Shop Interior", "Isometric Device Models"]],
  ["Code & Developer Resources", "Code Snippets & Libraries", "automation", "Reusable building blocks for everyday development tasks.", ["TypeScript Utility Kit", "Accessible Form Components", "Date Formatting Helpers"]],
  ["Code & Developer Resources", "Starter Projects & Developer Tools", "website", "Starter resources for prototyping and testing software.", ["Next.js Starter Workspace", "API Test Fixture Kit", "CLI Project Blueprint"]],
  ["No-Code & App Templates", "Workspace & Database Templates", "analytics", "Prestructured workspaces for managing projects and records.", ["Notion Project Hub", "Airtable Content Planner", "Client Intake Workspace"]],
  ["No-Code & App Templates", "No-Code App Templates", "website", "Prototype layouts for building apps without custom code.", ["Glide Inventory App", "Bubble Booking Prototype", "Softr Member Portal"]],
];

export const catalogueCategories = [...new Set(seedGroups.map(([category]) => category))];

export const catalogueProducts = seedGroups.flatMap(
  ([group, subcategory, type, description, entries], groupIndex) =>
    entries.map((entry, itemIndex) => {
      const original = typeof entry === "number" ? products.find(({ id }) => id === entry) : undefined;
      const product: Product = original ?? {
        id: 100 + groupIndex * 3 + itemIndex,
        title: String(entry),
        category: subcategory,
        type,
        price: 299 + ((groupIndex + itemIndex) % 8) * 150,
        creator: "KitCart Demo Studio",
        description,
        demoCover: true,
      };
      return { ...product, group, subcategory };
    }),
);

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

export function CataloguePreview({ product }: { product: Product }) {
  return product.demoCover ? (
    <div className={styles.preview}>
      <DemoArt id={product.id} group={product.category} />
    </div>
  ) : <ProductPreview type={product.type} />;
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <MarketplaceLink href={`/products/${product.id}`} prefetch={false}
      className={`${styles.productCard} ${detailStyles.cardLink}`}
      aria-label={`View ${product.title}`}>
      <CataloguePreview product={product} />
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
    </MarketplaceLink>
  );
}
