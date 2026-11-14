"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { MarketplaceLink } from "./marketplace-shell";
import styles from "./product-detail.module.css";

const cartKey = "kitcart-demo-cart";

export function readDemoCart(): number[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(cartKey) ?? "[]");
    return Array.isArray(value) ? [...new Set(value.filter((id): id is number => Number.isSafeInteger(id)))] : [];
  } catch {
    return [];
  }
}

export function writeDemoCart(ids: number[]) {
  try {
    localStorage.setItem(cartKey, JSON.stringify(ids));
    return true;
  } catch {
    return false;
  }
}

export default function ProductActions({ id }: { id: number }) {
  const [message, setMessage] = useState("");

  function add() {
    const ids = readDemoCart();
    if (ids.includes(id)) return setMessage("Already in your demo cart.");
    setMessage(writeDemoCart([...ids, id]) ? "Added to your demo cart." : "This browser could not save the demo cart.");
  }

  return (
    <>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={add}><ShoppingCart size={17} /> Add to cart</button>
        <MarketplaceLink className={styles.primary} href={`/cart?buy=${id}`}>Buy now</MarketplaceLink>
      </div>
      <p className={styles.muted}>Demo checkout only. No payment is collected.</p>
      <p role="status">{message}</p>
    </>
  );
}
