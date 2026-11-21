import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { listingLimits } from "@/features/seller/seller-requirements";
import { ListingInputError } from "@/lib/seller/listing-files";
import { saveSellerDraft, sellerAccess, submitSellerListing } from "@/lib/seller/listings";


function json(data: object, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function boundedBody(request: Request, maxBytes: number) {
  if (Number(request.headers.get("content-length")) > maxBytes) {
    throw new ListingInputError(413, "The upload exceeds the total size limit.");
  }
  if (!request.body) throw new ListingInputError(400, "Upload data is missing.");
  let size = 0;
  const stream = request.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      size += chunk.byteLength;
      if (size > maxBytes) throw new ListingInputError(413, "The upload exceeds the total size limit.");
      controller.enqueue(chunk);
    },
  }));
  return new Response(stream, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } });
}

export async function POST(request: NextRequest) {
  try {
    // Only same-origin writes are accepted. The frontend does not submit from external sites.
    const origin = request.headers.get("origin");
    const configured = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
    const host = request.headers.get("host");
    const siteOrigin = host ? `${request.nextUrl.protocol}//${host}` : request.nextUrl.origin;
    if (!origin || (origin !== siteOrigin && (!configured || origin !== new URL(configured).origin)) ||
      request.headers.get("sec-fetch-site") === "cross-site") {
      return json({ error: "Send uploads from the KitCart seller page." }, 403);
    }
    const userId = (await auth())?.user?.id;
    if (!userId) return json({ error: "Sign in to manage seller listings." }, 401);
    if (!(await sellerAccess(userId)).allowed) {
      return json({ error: "Identity and payout verification are both required." }, 403);
    }
    const type = request.headers.get("content-type") ?? "";
    if (/^application\/json(?:\s*;|$)/i.test(type)) {
      const body = await boundedBody(request, 64 * 1024);
      await saveSellerDraft(userId, await body.json());
      return json({ saved: true });
    }
    if (!/^multipart\/form-data\s*;/i.test(type)) return json({ error: "Choose the listing files through the upload form." }, 415);
    const body = await boundedBody(request, listingLimits.total * 1024 * 1024);
    return json({ listing: await submitSellerListing(userId, await body.formData()) }, 201);
  } catch (error) {
    if (error instanceof ListingInputError) return json({ error: error.message }, error.status);
    if (error instanceof SyntaxError || error instanceof TypeError) return json({ error: "The upload data could not be read." }, 400);
    console.error("KitCart listing could not be saved.", (error as { code?: string } | null)?.code ?? "unknown");
    return json({ error: "The listing could not be saved. Check your connection and try again." }, 500);
  }
}
