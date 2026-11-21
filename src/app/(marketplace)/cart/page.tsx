import { Suspense } from "react";
import { catalogueProducts } from "@/features/shop/marketplace/demo-catalogue";
import DemoCart from "@/features/shop/marketplace/demo-cart";

export const metadata = { title: "Demo cart | KitCart" };

type Props = { searchParams: Promise<{ buy?: string | string[] }> };

async function CartContent({ searchParams }: Props) {
  const { buy } = await searchParams;
  const products = catalogueProducts.map(({ id, title, price }) => ({ id, title, price }));
  const purchase = products.find(({ id }) => String(id) === buy);
  return <DemoCart products={products} purchase={purchase} />;
}

export default function CartPage({ searchParams }: Props) {
  return <Suspense fallback={<p role="status">Loading your demo cart…</p>}>
    <CartContent searchParams={searchParams} />
  </Suspense>;
}
