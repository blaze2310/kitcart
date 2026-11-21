import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getDb } from "@/lib/db";
import {
  compatibleLink, emptyDraft, fileExtension, fileIssue, findSubcategory, imageTypes,
  listingLimits, maxExtras, maxImages, videoTypes, type ListingDraft, type Verification,
} from "@/features/seller/seller-requirements";
import {
  createListingDirectory, ListingInputError, removeListingDirectory, validatedBytes, writeListingFile, type FileRole,
} from "./listing-files";

type FileSummary = { id: string; name: string; role: FileRole };
export type SellerListing = {
  id: string; title: string; category: string; subcategory: string;
  status: "pending_review" | "approved" | "rejected"; files: FileSummary[];
};

const caps: Record<keyof ListingDraft, number> = {
  title: 120, category: 100, subcategory: 100, platform: 80, price: 14,
  readme: 10000, compatibility: 4000, deliverableLink: 2048, guide: 12000,
};
const draftKeys = Object.keys(emptyDraft) as (keyof ListingDraft)[];
const offline = { identity_status: "not_started", payout_status: "not_started" } as const;

function localSellerTesting() {
  return process.env.NODE_ENV === "development" && process.env.KITCART_SELLER_TEST_MODE === "1";
}

export async function sellerAccess(userId: string | undefined) {
  const denied = { ...offline, allowed: false, testing: false };
  if (!userId) return denied;
  const { rows: [row] } = await getDb().query<{
    identity_status: Verification | null; payout_status: Verification | null;
  }>(
    `SELECT s.identity_status, s.payout_status FROM public.users u
     LEFT JOIN public.seller_verifications s ON s.user_id = u.id
     WHERE u.id = $1 AND u.is_active`, [userId],
  );
  if (!row) return denied;
  const identity_status = row.identity_status ?? offline.identity_status;
  const payout_status = row.payout_status ?? offline.payout_status;
  const verified = identity_status === "verified" && payout_status === "verified";
  const testing = localSellerTesting() && !verified;
  return { identity_status, payout_status, testing, allowed: verified || testing };
}

export async function sellerWorkspace(userId: string) {
  const [draft, listings] = await Promise.all([
    getDb().query<{ fields: ListingDraft }>("SELECT fields FROM public.seller_listing_drafts WHERE seller_id = $1", [userId]),
    getDb().query<SellerListing>(
      `SELECT l.id, l.title, l.category, l.subcategory, l.status, COALESCE((
         SELECT json_agg(json_build_object('id', f.id, 'name', f.original_name, 'role', f.role) ORDER BY f.role, f.original_name)
         FROM public.seller_listing_files f WHERE f.listing_id = l.id
       ), '[]'::json) AS files
       FROM public.seller_listings l WHERE l.seller_id = $1 ORDER BY l.created_at DESC LIMIT 100`, [userId],
    ),
  ]);
  return { draft: draft.rows[0]?.fields ?? emptyDraft, listings: listings.rows };
}

function fields(read: (name: string) => unknown) {
  const values = { ...emptyDraft };
  for (const key of draftKeys) {
    const value = read(key);
    if (value == null) continue;
    if (typeof value !== "string" || value.length > caps[key] || value.includes("\0")) {
      throw new ListingInputError(400, `Invalid ${key} field.`);
    }
    values[key] = value.trim();
  }
  return values;
}

function lockEligibleSeller() {
  if (localSellerTesting()) {
    return "FROM public.users u WHERE u.id = $1 AND u.is_active FOR SHARE OF u";
  }
  return `FROM public.seller_verifications s JOIN public.users u ON u.id = s.user_id
          WHERE u.id = $1 AND u.is_active AND s.identity_status = 'verified' AND s.payout_status = 'verified'
          FOR SHARE OF u, s`;
}

async function lockedSeller(db: PoolClient, userId: string) {
  const { rowCount } = await db.query(`SELECT u.id ${lockEligibleSeller()}`, [userId]);
  if (!rowCount) throw new ListingInputError(403, "An active and eligible seller account is required.");
}

export async function saveSellerDraft(userId: string, input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ListingInputError(400, "Invalid draft data.");
  const draft = fields(key => Object.hasOwn(input, key) ? (input as Record<string, unknown>)[key] : undefined);
  const { rowCount } = await getDb().query(
    `INSERT INTO public.seller_listing_drafts (seller_id, fields)
     SELECT u.id, $2 ${lockEligibleSeller()}
     ON CONFLICT (seller_id) DO UPDATE SET fields = EXCLUDED.fields, updated_at = now()`, [userId, JSON.stringify(draft)],
  );
  if (!rowCount) throw new ListingInputError(403, "Identity and payout verification are both required.");
}

function extractFiles(form: FormData, role: FileRole, maxCount: number, extensions: string[]) {
  const values = form.getAll(role);
  if (values.length > maxCount) throw new ListingInputError(400, `Too many ${role} files.`);
  return values.map(file => {
    if (!(file instanceof File) || file.name.length > 180 || /[\u0000-\u001f\u007f/\\]/.test(file.name)) {
      throw new ListingInputError(400, "Choose files with valid names up to 180 characters.");
    }
    const problem = fileIssue(file, extensions, listingLimits[role]);
    if (problem) throw new ListingInputError(415, problem);
    return { file, role, extension: fileExtension(file.name) };
  });
}

export async function submitSellerListing(userId: string, form: FormData): Promise<SellerListing> {
  const draft = fields(key => {
    const all = form.getAll(key);
    if (all.length > 1) throw new ListingInputError(400, "A listing field was sent more than once.");
    return all[0];
  });
  const permitted = new Set<string>([...draftKeys, "main", "cover", "image", "video", "pdf", "extra"]);
  for (const key of form.keys()) if (!permitted.has(key)) throw new ListingInputError(400, "Unexpected upload field.");

  const subcategory = findSubcategory(draft.category, draft.subcategory);
  const format = subcategory?.formats.find(item => item.name === draft.platform);
  if (!format || !subcategory) throw new ListingInputError(400, "Choose a supported category, subcategory and platform.");
  const [unit, fraction = ""] = draft.price.split(".");
  const price = Number(unit) * 100 + Number(fraction.padEnd(2, "0"));
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(draft.price) || price <= 0 || price > 2147483647) {
    throw new ListingInputError(400, "Enter a valid INR price from ₹0.01 to ₹21,474,836.47.");
  }
  if (!draft.title || !draft.readme || !draft.compatibility || !draft.guide) {
    throw new ListingInputError(400, "Enter a name, description, compatibility details and setup guide.");
  }
  const main = extractFiles(form, "main", Number(format.extensions.length > 0), format.extensions);
  if (Number(main.length > 0) + Number(Boolean(draft.deliverableLink)) !== 1) {
    throw new ListingInputError(400, "Provide either the compatible product file or the supported copy link.");
  }
  if (draft.deliverableLink && !compatibleLink(draft.deliverableLink, format.links ?? [])) {
    throw new ListingInputError(400, `Enter a supported HTTPS template/copy link for ${format.name}.`);
  }
  const cover = extractFiles(form, "cover", 1, imageTypes);
  if (!cover.length) throw new ListingInputError(400, "Upload a cover image of the actual product.");
  const pdf = extractFiles(form, "pdf", Number(Boolean(subcategory.pdfPreview)), [".pdf"]);
  if (subcategory.pdfPreview && !pdf.length) throw new ListingInputError(400, "Upload a separate PDF preview of the slides.");
  const images = extractFiles(form, "image", maxImages, imageTypes);
  if (subcategory.requiresExtraImage && !images.length) throw new ListingInputError(400, "Add a separate mobile screenshot.");
  const extras = extractFiles(form, "extra", format.extras?.length ? maxExtras : 0, format.extras ?? []);
  if (subcategory.requiredExtra && !extras.some(file => file.extension === subcategory.requiredExtra)) {
    throw new ListingInputError(400, `Attach a sample dataset in ${subcategory.requiredExtra} format.`);
  }
  const all = [...main, ...cover, ...pdf, ...images, ...extras, ...extractFiles(form, "video", 1, videoTypes)];
  if (all.reduce((sum, { file }) => sum + file.size, 0) > (listingLimits.total - 1) * 1024 * 1024) {
    throw new ListingInputError(413, `Keep the combined files under ${listingLimits.total - 1} MB.`);
  }

  const id = randomUUID();
  const path = await createListingDirectory(id);
  const stored: (FileSummary & { size: number })[] = [];
  let committed = false;
  let commitAttempted = false;
  try {
    for (const { file, role, extension } of all) {
      const data = await validatedBytes(file, extension, role, draft.platform);
      stored.push({ id: await writeListingFile(path, data), role, name: file.name, size: data.length });
    }
    const db = await getDb().connect();
    let failed = false;
    try {
      await db.query("BEGIN");
      await lockedSeller(db, userId);
      await db.query(
        `INSERT INTO public.seller_listings
         (id, seller_id, category, subcategory, platform, title, price_paise, description, prerequisites, setup_guide, delivery_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [id, userId, draft.category, draft.subcategory, draft.platform, draft.title, price,
          draft.readme, draft.compatibility, draft.guide, draft.deliverableLink || null],
      );
      for (const f of stored) {
        await db.query("INSERT INTO public.seller_listing_files (id, listing_id, role, original_name, byte_size) VALUES ($1,$2,$3,$4,$5)",
          [f.id, id, f.role, f.name, f.size]);
      }
      await db.query("DELETE FROM public.seller_listing_drafts WHERE seller_id = $1", [userId]);
      commitAttempted = true;
      await db.query("COMMIT");
      committed = true;
    } catch (error) {
      try { await db.query("ROLLBACK"); } catch { failed = true; }
      throw error;
    } finally { db.release(failed); }
  } finally {
    // A lost COMMIT response is ambiguous. Keep the private files for operator reconciliation.
    if (!committed && !commitAttempted) {
      await removeListingDirectory(path).catch(() => console.error("KitCart could not clean up an incomplete upload:", id));
    }
  }
  return { id, title: draft.title, category: draft.category, subcategory: draft.subcategory, status: "pending_review",
    files: stored.map(({ id: fileId, name, role }) => ({ id: fileId, name, role })) };
}
