import { ArrowLeft, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { catalogueProducts, CataloguePreview } from "@/features/shop/marketplace/demo-catalogue";
import { MarketplaceLink } from "@/features/shop/marketplace/marketplace-shell";
import ProductActions from "@/features/shop/marketplace/product-actions";
import { getProductDetails } from "@/features/shop/marketplace/product-details";
import styles from "@/features/shop/marketplace/product-detail.module.css";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return catalogueProducts.map(({ id }) => ({ id: String(id) }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const product = catalogueProducts.find((item) => String(item.id) === id);
  return { title: product ? `${product.title} | KitCart` : "Product not found | KitCart" };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = catalogueProducts.find((item) => String(item.id) === id);
  if (!product) notFound();
  const details = getProductDetails(product);

  return (
    <main className={styles.page}>
      <MarketplaceLink className={styles.back} href="/explore"><ArrowLeft size={16} /> Explore products</MarketplaceLink>
      <div className={styles.heading}>
        <p className={styles.kicker}>{product.group} / {product.subcategory}</p>
        <h1>{product.title}</h1>
        <p className={styles.muted}>By {product.creator} · Demo listing</p>
      </div>

      <div className={styles.columns}>
        <section className={styles.panel} aria-labelledby="product-media">
          <h2 id="product-media">Product previews</h2>
          <figure className={styles.figure}>
            <div className={styles.cover} role="img" aria-label={`Illustrated preview of ${product.title}`}>
              <CataloguePreview product={product} />
            </div>
            <figcaption>Illustrated product preview</figcaption>
          </figure>
          <figure className={styles.figure}>
            <video controls playsInline preload="none" aria-label={`Illustrative ${product.type} demo video`}
              src={`/kitcart-demo/${product.type}.mp4`} />
            <figcaption>Sample video · illustrative format walkthrough, no audio</figcaption>
          </figure>
        </section>

        <section className={styles.panel} aria-labelledby="product-description">
          <h2 id="product-description">About this product</h2>
          <p>{product.description}</p>
          <p>{details.description}</p>
          <h3>What this demo represents</h3>
          <ul>{details.includes.map((item) => <li key={item}>{item}</li>)}</ul>
          <div className={styles.priceBlock}>
            <span className={styles.muted}>Demo price</span>
            <strong className={styles.price}>₹{product.price.toLocaleString("en-IN")}</strong>
            <ProductActions item={{ id: product.id, title: product.title, creator: product.creator, price: product.price, description: product.description }} />
          </div>
        </section>
      </div>

      <section className={`${styles.panel} ${styles.ratings}`} aria-labelledby="product-ratings">
        <div><h2 id="product-ratings">Customer ratings</h2><p className={styles.muted}>Sample ratings for this demo. Not actual customer reviews.</p></div>
        <div className={styles.score}>
          <span className={styles.stars} aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <span className={styles.star} key={index}>
                <Star size={21} />
                <span style={{ width: `${Math.min(1, Math.max(0, details.rating - index)) * 100}%` }}><Star size={21} fill="currentColor" /></span>
              </span>
            ))}
          </span>
          <strong>{details.rating.toFixed(1)} / 5</strong>
          <span className={styles.muted}>{details.reviews} sample ratings</span>
        </div>
      </section>
    </main>
  );
}
