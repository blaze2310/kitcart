import { Suspense, type ReactNode } from "react";
import AccountNavigation, { AccountNavigationFallback } from "@/features/shop/marketplace/account-navigation";
import MarketplaceFrame from "./marketplace-frame";

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  return (
    <MarketplaceFrame accountControl={
      <Suspense fallback={<AccountNavigationFallback />}>
        <AccountNavigation />
      </Suspense>
    }>
      {children}
    </MarketplaceFrame>
  );
}
