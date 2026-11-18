"use client";

import { useEffect, useState } from "react";
import { MarketplaceLink } from "./marketplace-shell";
import { readDemoCart, writeDemoCart } from "./product-actions";
import styles from "./product-detail.module.css";

type Item = { id: number; title: string; price: number };

export default function DemoCart({ products, purchase }: { products: Item[]; purchase?: Item }) {
  const [ids, setIds] = useState<number[] | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    function sync() { setIds(readDemoCart()); }
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const items = purchase ? [purchase] : products.filter(({ id }) => ids?.includes(id));
  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <main className={styles.page}>
      <div className={styles.heading}>
        <p className={styles.kicker}>KITCART DEMO</p>
        <h1>{purchase ? "Checkout preview" : "Your cart"}</h1>
        <p className={styles.muted}>This is a demo. No order will be placed and no payment will be collected.</p>
      </div>
      <section className={styles.panel} aria-label={purchase ? "Order summary" : "Cart items"}>
        {!purchase && ids === null ? <p>Loading your cart…</p> : items.length === 0 ? <p>Your demo cart is empty.</p> : (
          <>
            <ul className={styles.cartItems}>{items.map(({ id, title, price }) => (
              <li key={id}>
                <MarketplaceLink href={`/products/${id}`}>{title}</MarketplaceLink>
                <strong>₹{price.toLocaleString("en-IN")}</strong>
                {!purchase && <button type="button" className={styles.secondary} onClick={() => {
                  const next = (ids ?? []).filter((value) => value !== id);
                  if (writeDemoCart(next)) { setIds(next); setMessage(`Removed ${title}.`); }
                  else setMessage("This browser could not update the demo cart.");
                }}>Remove<span className={styles.srOnly}> {title}</span></button>}
              </li>
            ))}</ul>
            <p className={styles.price}>Total · ₹{total.toLocaleString("en-IN")}</p>
          </>
        )}
        <p role="status">{message}</p>
        <MarketplaceLink className={styles.back} href="/explore">Continue exploring</MarketplaceLink>
      </section>
    </main>
  );
}
