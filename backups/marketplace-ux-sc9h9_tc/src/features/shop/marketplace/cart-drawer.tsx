"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ShoppingCart, X } from "lucide-react";
import styles from "./cart-drawer.module.css";

export type CartItem = { id: number; title: string; creator: string; price: number; description: string };

export default function CartDrawer({ item, open, onClose }: {
  item: CartItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <aside className={styles.drawer} id="marketplace-cart" data-open={open} inert={!open}
      aria-labelledby="marketplace-cart-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.stopPropagation(); onClose(); }
      }}>
      <header className={styles.drawerHeader}>
        <h2 id="marketplace-cart-title"><ShoppingCart size={21} aria-hidden="true" /> Your cart</h2>
        <button ref={closeRef} type="button" aria-label="Close cart" onClick={onClose}><X size={22} aria-hidden="true" /></button>
      </header>
      <div className={styles.drawerBody}>
        {item ? (
          <div className={styles.lineItem}>
            <span className={styles.label}>DIGITAL PRODUCT · DEMO</span>
            <h3>{item.title}</h3>
            <p>By {item.creator}</p>
            <p>{item.description}</p>
            <strong>₹{item.price.toLocaleString("en-IN")}</strong>
          </div>
        ) : <p>Your demo cart is empty.</p>}
      </div>
      {item && (
        <footer className={styles.drawerFooter}>
          <div className={styles.total}><span>Total</span><strong>₹{item.price.toLocaleString("en-IN")}</strong></div>
          <Link className={styles.buy} href={`/cart?buy=${item.id}`} onNavigate={onClose}>Buy now</Link>
          <p>Demo checkout. No payment is collected.</p>
        </footer>
      )}
    </aside>
  );
}
