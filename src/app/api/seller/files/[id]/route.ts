import { Readable } from "node:stream";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { openListingFile, uuidPattern } from "@/lib/seller/listing-files";

const cache = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = (await auth())?.user?.id;
  if (!userId) return new Response(null, { status: 401, headers: cache });
  const { id } = await params;
  if (!uuidPattern.test(id)) return new Response(null, { status: 404, headers: cache });

  const { rows: [file] } = await getDb().query<{ listing_id: string; original_name: string; byte_size: number }>(
    `SELECT f.listing_id, f.original_name, f.byte_size
     FROM public.seller_listing_files f JOIN public.seller_listings l ON l.id = f.listing_id
     JOIN public.users u ON u.id = l.seller_id AND u.is_active
     WHERE f.id = $1 AND l.seller_id = $2`, [id, userId],
  );
  if (!file) return new Response(null, { status: 404, headers: cache });
  try {
    const stream = await openListingFile(file.listing_id, id);
    const filename = encodeURIComponent(file.original_name.toWellFormed()).replace(/['()*]/g, c => "%" + c.charCodeAt(0).toString(16));
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { headers: {
      ...cache, "Content-Type": "application/octet-stream",
      "Content-Length": String(file.byte_size),
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return new Response(null, { status: 404, headers: cache });
  }
}
