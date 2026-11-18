import { catalogueCategories, catalogueProducts } from "@/features/shop/marketplace/demo-catalogue";
import SellerPreview from "@/features/seller/seller-preview";

export const metadata = { title: "Start selling | KitCart" };

export default function SellPage() {
  const groups = catalogueCategories.map((name) => ({
    name,
    children: [...new Set(catalogueProducts.filter((product) => product.group === name).map((product) => product.subcategory))],
  }));

  return <SellerPreview groups={groups} />;
}
