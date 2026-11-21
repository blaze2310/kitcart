import { Suspense } from "react";
import { connection } from "next/server";
import { auth } from "@/auth";
import SellerPreview from "@/features/seller/seller-preview";
import { emptyDraft, type ListingDraft, type Verification } from "@/features/seller/seller-requirements";
import { sellerAccess, sellerWorkspace, type SellerListing } from "@/lib/seller/listings";

export const metadata = { title: "Start selling | KitCart" };

async function SellerAccount() {
  await connection();
  const user = (await auth())?.user;
  const userId = user?.id;
  const initial: { draft: ListingDraft; listings: SellerListing[]; identity: Verification; payout: Verification; unavailable: boolean; canSell: boolean; testing: boolean } =
    { draft: emptyDraft, listings: [], identity: "not_started", payout: "not_started", unavailable: false, canSell: false, testing: false };
  try {
    const checks = await sellerAccess(userId);
    initial.identity = checks.identity_status;
    initial.payout = checks.payout_status;
    if (userId && checks.allowed) {
      Object.assign(initial, await sellerWorkspace(userId));
      initial.canSell = true;
      initial.testing = checks.testing;
    }
  } catch {
    initial.unavailable = true;
  }
  return <SellerPreview key={userId ?? "guest"} signedIn={Boolean(userId)} sellerName={user?.name} {...initial} />;
}

export default function SellPage() {
  return <Suspense fallback={<main aria-busy="true">Loading seller workspace…</main>}><SellerAccount /></Suspense>;
}
