"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  Menu,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";

import CartDrawer, { type CartItem } from "./cart-drawer";
import { flyCartIcon } from "./cart-flight";
import cartStyles from "./cart-drawer.module.css";
import HeroPet from "@/features/robot/pet/hero-pet";
import styles from "./home.module.css";
import shellStyles from "./marketplace-shell.module.css";

const NavigationContext = createContext<((href: string) => void) | null>(null);
const CartContext = createContext<((item: CartItem, source: SVGElement | null, trigger: HTMLButtonElement) => Promise<void>) | null>(null);

export function useMarketplaceCart() {
  return useContext(CartContext);
}

const navigation = [
  { href: "/", label: "Discover" },
  { href: "/explore", label: "Explore" },
  { href: "/about", label: "About" },
  { href: "/help", label: "Help" },
];

type MarketplaceLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onNavigate"> & {
  href: string;
  onRoute?: () => void;
};

export function MarketplaceLink({ href, onRoute, ...props }: MarketplaceLinkProps) {
  const navigate = useContext(NavigationContext);

  return (
    <Link
      {...props}
      href={href}
      onNavigate={(event) => {
        if (!navigate) return;
        event.preventDefault();
        onRoute?.();
        navigate(href);
      }}
    />
  );
}

export function MarketplaceSearch({
  hero = false,
  onRoute,
}: {
  hero?: boolean;
  onRoute?: () => void;
}) {
  const navigate = useContext(NavigationContext);

  function submit(event: FormEvent<HTMLFormElement>) {
    if (!navigate) return;
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    const href = query ? `/explore?${new URLSearchParams({ q: query })}` : "/explore";
    onRoute?.();
    navigate(href);
  }

  return (
    <form
      action="/explore"
      method="get"
      className={hero ? styles.heroSearch : styles.navSearch}
      onSubmit={submit}
    >
      <Search size={hero ? 19 : 16} aria-hidden="true" />
      <input
        type="search"
        autoComplete="off"
        name="q"
        aria-label={hero ? "Find digital products" : "Search digital products"}
        placeholder={
          hero ? 'Try "dashboard" or "website template"' : "Search anything..."
        }
      />
      {hero && (
        <button type="submit">
          Search <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      )}
    </form>
  );
}

export default function MarketplaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const activeExit = useRef<Animation | null>(null);
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isPending && activeExit.current?.playState === "finished") {
      activeExit.current.cancel();
      activeExit.current = null;
    }
  }, [isPending, pathname]);

  useEffect(() => () => activeExit.current?.cancel(), []);

  function navigate(href: string) {
    if (activeExit.current) return;

    const destination = new URL(href, window.location.href);
    if (destination.href === window.location.href) return;

    const stage = stageRef.current;
    if (
      destination.pathname === pathname ||
      !stage ||
      typeof stage.animate !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      router.push(href);
      return;
    }

    const exit = stage.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 130,
      easing: "ease-in",
      fill: "forwards",
    });
    activeExit.current = exit;
    void exit.finished.then(
      () => startTransition(() => router.push(href)),
      () => {
        if (activeExit.current === exit) activeExit.current = null;
      },
    );
  }

  const [cartItem, setCartItem] = useState<CartItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const navCart = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const flightToken = useRef(0);

  function closeCart() {
    flightToken.current++;
    setCartOpen(false);
    returnFocus.current?.focus({ preventScroll: true });
  }

  async function addToCart(item: CartItem, source: SVGElement | null, trigger: HTMLButtonElement) {
    const token = ++flightToken.current;
    setCartItem(item);
    returnFocus.current = trigger;
    if (!cartOpen) await flyCartIcon(source, navCart.current);
    if (flightToken.current === token) setCartOpen(true);
  }

  function closeNavigation() {
    setMenuOpen(false);
    closeCart();
  }

  function navLinks() {
    return navigation.map(({ href, label }) => (
      <MarketplaceLink
        key={href}
        href={href}
        aria-current={pathname === href ? "page" : undefined}
        onRoute={closeNavigation}
      >
        {label}
      </MarketplaceLink>
    ));
  }

  return (
    <NavigationContext.Provider value={navigate}>
      <CartContext.Provider value={addToCart}>
      <div className={`${styles.marketplace} ${shellStyles.surface}`}>
        <div className={cartStyles.frame} data-cart-open={cartOpen}>
        <div className={styles.container}>
          <div className={shellStyles.petHeaderRow}>
            <HeroPet pathname={pathname} cartOpen={cartOpen} />
            <header className={styles.header}>
              <MarketplaceLink
                href="/"
                className={styles.brand}
                aria-label="KitCart home"
                onRoute={closeNavigation}
              >
                <span className={styles.brandLockup}>
                  <Image
                    src="/kitcart-brand/kitcart_full_light.svg" width={1200} height={492}
                    alt="From a Dot to a Star."
                    unoptimized
                  />
                </span>
              </MarketplaceLink>

              <nav className={styles.desktopNav} aria-label="Main navigation">
                {navLinks()}
              </nav>

              <MarketplaceSearch onRoute={closeNavigation} />

              <MarketplaceLink href="/sell" className={styles.sellerButton} onRoute={closeNavigation}>
                Start selling <ArrowUpRight size={15} aria-hidden="true" />
              </MarketplaceLink>

              <button type="button" ref={navCart} className={styles.navIcon} aria-label="Shopping cart"
                aria-controls="marketplace-cart" aria-expanded={cartOpen}
                onClick={() => {
                  if (cartOpen) closeCart();
                  else {
                    flightToken.current++;
                    returnFocus.current = navCart.current;
                    setCartOpen(true);
                  }
                }}>
                <ShoppingCart size={19} aria-hidden="true" />
              </button>

              <Link href="/login" className={styles.navIcon} aria-label="Sign in">
                <UserRound size={19} aria-hidden="true" />
              </Link>

              <button
                type="button"
                className={styles.mobileMenuButton}
                aria-expanded={menuOpen}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
              </button>
            </header>
          </div>

          {menuOpen && (
            <nav className={styles.mobileMenu} aria-label="Mobile navigation">
              {navLinks()}
              <Link href="/login">Sign in</Link>
              <MarketplaceLink href="/sell" onRoute={closeNavigation}>Start selling</MarketplaceLink>
            </nav>
          )}

          <div key={pathname} ref={stageRef} className={shellStyles.stage}>
            {children}
          </div>
        </div>
        <CartDrawer item={cartItem} open={cartOpen} onClose={closeCart} onRemove={() => setCartItem(null)} />
        </div>
      </div>
      </CartContext.Provider>
    </NavigationContext.Provider>
  );
}
