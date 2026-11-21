import "server-only";

import sharp from "sharp";
import { getDb } from "../db";

const maxUpload = 5 * 1024 * 1024;
const mimeFormats: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

export class PhotoInputError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function hasImageSignature(format: string, data: Buffer) {
  if (format === "jpeg") return data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (format === "png") return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP";
}

export async function sanitizeProfilePhoto(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  const format = Object.hasOwn(mimeFormats, contentType) ? mimeFormats[contentType] : "";
  if (!format || !request.body) throw new PhotoInputError(415, "Choose a JPG, PNG or WebP image.");
  if (Number(request.headers.get("content-length")) > maxUpload) {
    throw new PhotoInputError(413, "Choose an image up to 5 MB.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxUpload) {
        // Don't wait for the rest of a rejected request to arrive.
        void reader.cancel().catch(() => {});
        throw new PhotoInputError(413, "Choose an image up to 5 MB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const input = Buffer.concat(chunks, bytes);
  if (!hasImageSignature(format, input)) throw new PhotoInputError(415, "That file is not a supported image.");

  try {
    const image = sharp(input, { limitInputPixels: 16_000_000, failOn: "warning" });
    const metadata = await image.metadata();
    if (metadata.format !== format || (metadata.pages ?? 1) !== 1) throw new Error();
    const output = await image.rotate().resize({
      width: 512, height: 512, fit: "inside", withoutEnlargement: true,
    }).webp({ quality: 78 }).toBuffer();
    if (output.length > 262144) throw new Error();
    return output;
  } catch {
    throw new PhotoInputError(422, "Use a still JPG, PNG or WebP image with no more than 16 million pixels.");
  }
}

export async function loadProfilePhoto(userId: string) {
  const { rows: [photo] } = await getDb().query<{ image_webp: Buffer }>(
    `SELECT a.image_webp FROM public.user_avatars a
     JOIN public.users u ON u.id = a.user_id
     WHERE u.id = $1 AND u.is_active`,
    [userId],
  );
  return photo?.image_webp ?? null;
}

export async function saveProfilePhoto(userId: string, image: Buffer) {
  const { rows: [photo] } = await getDb().query<{ version: string }>(
    `INSERT INTO public.user_avatars (user_id, image_webp)
     SELECT id, $2 FROM public.users WHERE id = $1 AND is_active FOR UPDATE
     ON CONFLICT (user_id) DO UPDATE SET image_webp = EXCLUDED.image_webp, version = gen_random_uuid()
     RETURNING version`,
    [userId, image],
  );
  return photo?.version ?? null;
}

export async function deleteProfilePhoto(userId: string) {
  const db = await getDb().connect();
  let discard = false;
  try {
    await db.query("BEGIN");
    const owner = await db.query("SELECT id FROM public.users WHERE id = $1 AND is_active FOR UPDATE", [userId]);
    if (owner.rowCount) {
      await db.query("DELETE FROM public.user_avatars WHERE user_id = $1", [userId]);
      await db.query("UPDATE public.users SET image_url = NULL WHERE id = $1", [userId]);
    }
    await db.query("COMMIT");
    return Boolean(owner.rowCount);
  } catch (error) {
    try { await db.query("ROLLBACK"); } catch { discard = true; }
    throw error;
  } finally {
    db.release(discard);
  }
}
