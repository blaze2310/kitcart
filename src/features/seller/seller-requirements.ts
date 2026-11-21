import taxonomy from "./seller-taxonomy.json";

export const checklist = [
  ["Your final digital product", "The file, bundle or supported template the buyer will receive."],
  ["A product description or README", "What it does, who it’s for and what the buyer gets."],
  ["An installation or usage guide", "How to open, edit, import, install or use the product."],
  ["At least one real product image", "Show the actual product. Extra images and a video are optional. A video does not replace the cover image."],
] as const;

type SellerFormat = { name: string; extensions: string[]; links?: string[]; extras?: string[]; note?: string };
type SellerSubcategory = {
  name: string; formats: SellerFormat[]; delivery: string; preview: string; proof: string;
  software: string; guide: string; package: string; pdfPreview?: boolean;
  requiredExtra?: string; requiresExtraImage?: boolean;
};
export const sellerGroups: { name: string; children: SellerSubcategory[] }[] = taxonomy;
export const listingLimits = { main: 50, cover: 10, image: 10, video: 15, pdf: 5, extra: 10, total: 80 };
export const imageTypes = [".jpg", ".jpeg", ".png", ".webp"];
export const videoTypes = [".mp4", ".webm"];
export const maxImages = 3;
export const maxExtras = 5;

export type ListingDraft = {
  title: string; category: string; subcategory: string; platform: string; price: string;
  readme: string; compatibility: string; deliverableLink: string; guide: string;
};
export const emptyDraft: ListingDraft = {
  title: "", category: "", subcategory: "", platform: "", price: "",
  readme: "", compatibility: "", deliverableLink: "", guide: "",
};
export type Verification = "not_started" | "pending" | "needs_attention" | "verified";

export function findSubcategory(category: string, subcategory: string) {
  return sellerGroups.find((group) => group.name === category)?.children.find((item) => item.name === subcategory);
}

export function fileExtension(name: string) {
  return /\.[a-z\d]+$/i.exec(name.trim())?.[0].toLowerCase() ?? "";
}

export function fileIssue(file: { name: string; size: number }, formats: readonly string[], mb: number) {
  if (!formats.includes(fileExtension(file.name))) return `“${file.name}” is not compatible. Accepted: ${formats.join(", ")}.`;
  if (!file.size || file.size > mb * 1024 * 1024) return `“${file.name}” must be non-empty and no larger than ${mb} MB.`;
  return undefined;
}

const linkRules: Record<string, [string, RegExp]> = {
  figma: ["figma.com", /^\/(?:design|file|community\/file)\/[\w-]+/],
  n8n: ["n8n.io", /^\/workflows\/\d+/],
  make: ["make.com", /^\/(?:en\/)?templates\/[\w-]+/],
  slides: ["docs.google.com", /^\/presentation\/d\/[\w-]+\/(?:copy|template\/preview)\/?$/],
  docs: ["docs.google.com", /^\/document\/d\/[\w-]+\/(?:copy|template\/preview)\/?$/],
  sheets: ["docs.google.com", /^\/spreadsheets\/d\/[\w-]+\/(?:copy|template\/preview)\/?$/],
  looker: ["lookerstudio.google.com", /^\/reporting\/[\w-]+(?:\/page\/[\w-]+)?\/?$/],
  canva: ["canva.com", /^\/design\/[\w-]+/],
  notion: ["notion.site", /^\/(?:[\w-]+\/)*[\w-]+\/?$/],
  airtable: ["airtable.com", /^\/(?:shr|app)[\w]+(?:\/|$)/],
  bubble: ["bubble.io", /^\/template\/[\w-]+/],
  flutterflow: ["marketplace.flutterflow.io", /^\/item\/[\w-]+/],
  glide: ["glideapps.com", /^\/templates\/[\w-]+/],
};

export function compatibleLink(value: string, allowed: readonly string[]) {
  if (value.length > 2048) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    return allowed.some((id) => {
      const rule = linkRules[id];
      if (!rule) return false;
      const [hostname, path] = rule;
      const host = url.hostname.toLowerCase();
      const hostOK = host === hostname || host === `www.${hostname}` ||
        (id === "notion" && (host.endsWith(".notion.site") || host === "www.notion.so" || host === "notion.so"));
      return hostOK && path.test(url.pathname);
    });
  } catch { return false; }
}
