"use client";

import { useRef, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { MarketplaceLink, useMarketplaceCart } from "./marketplace-shell";
import type { CartItem } from "./cart-drawer";
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

export default function ProductActions({ item }: { item: CartItem }) {
  const openCart = useMarketplaceCart();
  const icon = useRef<SVGSVGElement>(null);
  const [busy, setBusy] = useState(false);

  async function add(trigger: HTMLButtonElement) {
    if (busy || !openCart) return;
    setBusy(true);
    try {
      await openCart(item, icon.current, trigger);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} aria-disabled={busy} onClick={(event) => void add(event.currentTarget)}><ShoppingCart ref={icon} size={17} aria-hidden="true" /> Add to cart</button>
        <MarketplaceLink className={styles.primary} href={`/cart?buy=${item.id}`}>Buy now</MarketplaceLink>
      </div>
      <p className={styles.muted}>Demo checkout only. No payment is collected.</p>
    </>
  );
}
